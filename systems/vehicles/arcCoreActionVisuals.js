import {
  applyArcCoreLayer,
  arcCoreEnvelope,
  smoothArcCoreValue,
  textureForArcCoreRole,
} from "./arcCoreLayerPlacement.js";

const RAD_TO_DEG = 180 / Math.PI;

function tileFace(target, direction, tileSize) {
  if (direction.x > 0) {
    return { x: target.tx * tileSize, y: (target.ty + 0.5) * tileSize };
  }
  if (direction.x < 0) {
    return { x: (target.tx + 1) * tileSize, y: (target.ty + 0.5) * tileSize };
  }
  return {
    x: (target.tx + 0.5) * tileSize,
    y: direction.y > 0 ? target.ty * tileSize : (target.ty + 1) * tileSize,
  };
}

function targetFootprint(targets, tileSize) {
  if (!targets.length) return null;
  let minimumX = targets[0].tx;
  let maximumX = targets[0].tx;
  let minimumY = targets[0].ty;
  let maximumY = targets[0].ty;
  for (let index = 1; index < targets.length; index += 1) {
    const target = targets[index];
    minimumX = Math.min(minimumX, target.tx);
    maximumX = Math.max(maximumX, target.tx);
    minimumY = Math.min(minimumY, target.ty);
    maximumY = Math.max(maximumY, target.ty);
  }
  const left = minimumX * tileSize;
  const top = minimumY * tileSize;
  const right = (maximumX + 1) * tileSize;
  const bottom = (maximumY + 1) * tileSize;
  return {
    x: (left + right) * 0.5,
    y: (top + bottom) * 0.5,
    width: right - left,
    height: bottom - top,
    size: Math.max(right - left, bottom - top),
  };
}

function drawBeam(state, profile, tuning, options, anchor, size, alpha) {
  const timeline = profile.dig.timeline;
  const beamAlpha = options.active
    ? arcCoreEnvelope(
      options.progress,
      timeline.beamStart,
      timeline.beamPeak,
      timeline.beamEnd,
    )
    : 0;
  const targets = options.targets || [];
  if (beamAlpha <= 0 || !targets.length) {
    state.beam.setVisible(false);
    return;
  }
  let faceX = 0;
  let faceY = 0;
  let frontCount = 0;
  for (const target of targets) {
    if (target.depthIndex !== 0) continue;
    const face = tileFace(target, options.direction, options.tileSize);
    faceX += face.x;
    faceY += face.y;
    frontCount += 1;
  }
  if (frontCount === 0) {
    state.beam.setVisible(false);
    return;
  }
  const contact = {
    x: faceX / frontCount,
    y: faceY / frontCount,
  };
  if (options.direction.x !== 0) {
    contact.y = anchor.y + (contact.y - anchor.y)
      * tuning.beamCrossAxisFollowRatio;
  } else {
    contact.x = anchor.x + (contact.x - anchor.x)
      * tuning.beamCrossAxisFollowRatio;
  }
  const startDistance = size * profile.dig.beamStartRatio;
  const start = {
    x: anchor.x + options.direction.x * startDistance,
    y: anchor.y + options.direction.y * startDistance,
  };
  const reach = options.progress >= timeline.beamPeak
    ? 1
    : smoothArcCoreValue(
      (options.progress - timeline.beamStart)
      / (timeline.beamPeak - timeline.beamStart),
    );
  const tip = {
    x: start.x + (contact.x - start.x) * reach,
    y: start.y + (contact.y - start.y) * reach,
  };
  const dx = tip.x - start.x;
  const dy = tip.y - start.y;
  const pulse = 1 + Math.sin(options.timeMs * tuning.beamPulseTimeScale)
    * profile.dig.beamPulseRatio;
  applyArcCoreLayer(state.beam, {
    texture: textureForArcCoreRole(state, profile.beamRole),
    x: (start.x + tip.x) * 0.5,
    y: (start.y + tip.y) * 0.5,
    width: Math.max(
      2,
      Math.hypot(dx, dy) + profile.dig.beamLengthPaddingPx * reach,
    ) * pulse,
    height: profile.dig.beamHeightPx * pulse,
    angleDeg: Math.atan2(dy, dx) * RAD_TO_DEG,
    depth: profile.depths.beam,
    alpha: alpha * beamAlpha * profile.dig.beamAlpha,
    visibleAlphaThreshold: tuning.visibleAlphaThreshold,
  });
}

function drawImpact(state, profile, tuning, options, alpha) {
  const timeline = profile.dig.timeline;
  const impactAlpha = options.active
    ? arcCoreEnvelope(
      options.progress,
      timeline.impactStart,
      timeline.impactPeak,
      timeline.impactEnd,
    )
    : 0;
  if (impactAlpha <= 0) {
    state.impact.setVisible(false);
    state.impactEcho.setVisible(false);
    return;
  }
  const footprint = targetFootprint(options.targets || [], options.tileSize);
  if (!footprint) {
    state.impact.setVisible(false);
    state.impactEcho.setVisible(false);
    return;
  }
  const size = footprint.size + profile.dig.impactPaddingPx * 2;
  const texture = textureForArcCoreRole(state, profile.impactRole);
  const emerge = smoothArcCoreValue(
    (options.progress - timeline.impactStart)
    / (timeline.impactPeak - timeline.impactStart),
  );
  const dissipate = smoothArcCoreValue(
    (options.progress - timeline.impactPeak)
    / (timeline.impactEnd - timeline.impactPeak),
  );
  const impactScale = profile.dig.impactStartScale
    + (1 - profile.dig.impactStartScale) * emerge
    + (profile.dig.impactEndScale - 1) * dissipate;
  const rotation = options.timeMs / 1000
    * profile.dig.impactRotationDegPerSecond;
  applyArcCoreLayer(state.impactEcho, {
    texture,
    x: footprint.x,
    y: footprint.y,
    width: size * impactScale * profile.dig.impactEchoScale,
    height: size * impactScale * profile.dig.impactEchoScale,
    angleDeg: -rotation,
    depth: profile.depths.impactEcho,
    alpha: alpha * impactAlpha * profile.dig.impactEchoAlpha,
    visibleAlphaThreshold: tuning.visibleAlphaThreshold,
  });
  applyArcCoreLayer(state.impact, {
    texture,
    x: footprint.x,
    y: footprint.y,
    width: size * impactScale,
    height: size * impactScale,
    angleDeg: rotation * tuning.impactRotationRatio,
    depth: profile.depths.impact,
    alpha: alpha * impactAlpha * profile.dig.impactAlpha,
    visibleAlphaThreshold: tuning.visibleAlphaThreshold,
  });
}

export function drawArcCoreActionVisuals(
  state,
  profile,
  tuning,
  options,
  anchor,
  size,
  alpha,
) {
  drawBeam(state, profile, tuning, options, anchor, size, alpha);
  drawImpact(state, profile, tuning, options, alpha);
}
