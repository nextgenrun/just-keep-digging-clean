import {
  applyArcCoreLayer,
  arcCoreEnvelope,
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
  const left = Math.min(...targets.map(target => target.tx)) * tileSize;
  const top = Math.min(...targets.map(target => target.ty)) * tileSize;
  const right = (Math.max(...targets.map(target => target.tx)) + 1) * tileSize;
  const bottom = (Math.max(...targets.map(target => target.ty)) + 1) * tileSize;
  return {
    x: (left + right) * 0.5,
    y: (top + bottom) * 0.5,
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
  const front = (options.targets || [])
    .filter(target => target.depthIndex === 0)
    .sort((a, b) => a.widthIndex - b.widthIndex);
  if (beamAlpha <= 0 || !front.length) {
    state.beam.setVisible(false);
    return;
  }
  const faces = front.map(target => (
    tileFace(target, options.direction, options.tileSize)
  ));
  const contact = {
    x: faces.reduce((sum, face) => sum + face.x, 0) / faces.length,
    y: faces.reduce((sum, face) => sum + face.y, 0) / faces.length,
  };
  const startDistance = size * profile.dig.beamStartRatio;
  const start = {
    x: anchor.x + options.direction.x * startDistance,
    y: anchor.y + options.direction.y * startDistance,
  };
  const dx = contact.x - start.x;
  const dy = contact.y - start.y;
  const pulse = 1 + Math.sin(options.timeMs * tuning.beamPulseTimeScale)
    * profile.dig.beamPulseRatio;
  applyArcCoreLayer(state.beam, {
    texture: textureForArcCoreRole(state, profile.beamRole),
    x: (start.x + contact.x) * 0.5,
    y: (start.y + contact.y) * 0.5,
    width: (Math.hypot(dx, dy) + profile.dig.beamLengthPaddingPx) * pulse,
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
  const footprint = targetFootprint(options.targets || [], options.tileSize);
  if (!footprint || impactAlpha <= 0) {
    state.impact.setVisible(false);
    state.impactEcho.setVisible(false);
    return;
  }
  const size = footprint.size + profile.dig.impactPaddingPx * 2;
  const texture = textureForArcCoreRole(state, profile.impactRole);
  const rotation = options.timeMs / 1000
    * profile.dig.impactRotationDegPerSecond;
  applyArcCoreLayer(state.impactEcho, {
    texture,
    x: footprint.x,
    y: footprint.y,
    width: size * profile.dig.impactEchoScale,
    height: size * profile.dig.impactEchoScale,
    angleDeg: -rotation,
    depth: profile.depths.impactEcho,
    alpha: alpha * impactAlpha * profile.dig.impactEchoAlpha,
    visibleAlphaThreshold: tuning.visibleAlphaThreshold,
  });
  applyArcCoreLayer(state.impact, {
    texture,
    x: footprint.x,
    y: footprint.y,
    width: size,
    height: size,
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
