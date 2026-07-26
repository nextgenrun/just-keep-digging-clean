import {
  getArcCoreAnimationReviewMode,
} from "../../../values/arcCoreAnimationReview.js";
import {
  ARC_CORE_SPRITE_REVIEW_PACK,
} from "../../../values/arcCoreSpriteReview.js";

const ROOT_PREFIX = "../../../";
const TAU = Math.PI * 2;
const RAD_TO_DEG = 180 / Math.PI;

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function smooth(value) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

function envelope(progress, start, peak, end) {
  if (progress <= start || progress >= end) return 0;
  if (progress < peak) return smooth((progress - start) / (peak - start));
  return 1 - smooth((progress - peak) / (end - peak));
}

function buildRoleMap(manifest) {
  const section = manifest?.[ARC_CORE_SPRITE_REVIEW_PACK.assetSection];
  if (!Array.isArray(section?.files)) {
    throw new Error("Arc Core .sprite pack is missing its asset section");
  }
  return Object.fromEntries(section.files.map(file => [file.role, file.key]));
}

function createLayer(scene, texture, blendMode) {
  const layer = scene.add.sprite(0, 0, texture).setVisible(false);
  if (blendMode !== undefined) layer.setBlendMode(blendMode);
  return layer;
}

function applyLayer(layer, options) {
  layer
    .setTexture(options.texture)
    .setOrigin(options.originX ?? 0.5, options.originY ?? 0.5)
    .setPosition(options.x, options.y)
    .setDisplaySize(options.width, options.height)
    .setAngle(options.angleDeg ?? 0)
    .setDepth(options.depth)
    .setAlpha(clamp(options.alpha))
    .setVisible(options.alpha > 0.002);
}

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

export function preloadArcCoreSpriteArtwork(scene) {
  scene.load.pack(
    ARC_CORE_SPRITE_REVIEW_PACK.key,
    `${ROOT_PREFIX}${ARC_CORE_SPRITE_REVIEW_PACK.path}`,
  );
}

export function createArcCoreSpriteArtwork(scene) {
  const manifest = scene.cache.json.get(ARC_CORE_SPRITE_REVIEW_PACK.key);
  const meta = manifest?.[ARC_CORE_SPRITE_REVIEW_PACK.metaSection];
  if (!meta?.reviewOnly || meta.productionChanged !== false) {
    throw new Error("Arc Core .sprite pack violated the review-only boundary");
  }
  if (meta.pipeline !== "piskel-roundtrip") {
    throw new Error("Arc Core artwork did not pass through Piskel");
  }
  const blend = globalThis.Phaser?.BlendModes || {};
  const roles = buildRoleMap(manifest);
  return {
    manifest,
    meta,
    roles,
    body: createLayer(scene, roles["small.body"]),
    energyGhost: createLayer(scene, roles["small.ring"], blend.SCREEN),
    energyPrimary: createLayer(scene, roles["small.ring"], blend.ADD),
    energySecondary: createLayer(scene, roles["small.ring"], blend.ADD),
    beam: createLayer(scene, roles["small.beam"], blend.ADD),
    impactEcho: createLayer(scene, roles["small.impact"], blend.SCREEN),
    impact: createLayer(scene, roles["small.impact"], blend.ADD),
    cloudBack: createLayer(scene, roles["small.cloud"], blend.SCREEN),
    transitionGlyph: createLayer(scene, roles["small.ring"], blend.ADD),
    cloudFront: createLayer(scene, roles["small.cloud"], blend.ADD),
    activeProfileId: null,
  };
}

export function hideArcCoreSpriteArtwork(state) {
  if (!state) return;
  for (const key of [
    "body",
    "energyGhost",
    "energyPrimary",
    "energySecondary",
    "beam",
    "impactEcho",
    "impact",
    "cloudBack",
    "transitionGlyph",
    "cloudFront",
  ]) {
    state[key]?.setVisible(false);
  }
}

function profileFor(state, modeId) {
  return state?.meta?.modes?.[modeId] || null;
}

function textureFor(state, role) {
  const texture = state?.roles?.[role];
  if (!texture) throw new Error(`Arc Core .sprite role is missing: ${role}`);
  return texture;
}

function drawBeamAndImpact(state, profile, options, anchor, size, alpha) {
  const progress = clamp(options.progress);
  const timeline = profile.dig.timeline;
  const beamAlpha = options.active
    ? envelope(
      progress,
      timeline.beamStart,
      timeline.beamPeak,
      timeline.beamEnd,
    )
    : 0;
  const front = (options.targets || [])
    .filter(target => target.depthIndex === 0)
    .sort((a, b) => a.widthIndex - b.widthIndex);
  if (beamAlpha > 0 && front.length) {
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
    const pulse = 1 + Math.sin(options.timeMs * 0.035)
      * profile.dig.beamPulseRatio;
    applyLayer(state.beam, {
      texture: textureFor(state, profile.beamRole),
      x: (start.x + contact.x) * 0.5,
      y: (start.y + contact.y) * 0.5,
      width: (Math.hypot(dx, dy) + profile.dig.beamLengthPaddingPx) * pulse,
      height: profile.dig.beamHeightPx * pulse,
      angleDeg: Math.atan2(dy, dx) * RAD_TO_DEG,
      depth: profile.depths.beam,
      alpha: alpha * beamAlpha * profile.dig.beamAlpha,
    });
  } else {
    state.beam.setVisible(false);
  }

  const impactAlpha = options.active
    ? envelope(
      progress,
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
  const impactSize = footprint.size + profile.dig.impactPaddingPx * 2;
  const impactTexture = textureFor(state, profile.impactRole);
  const echoScale = profile.dig.impactEchoScale;
  const rotation = options.timeMs / 1000
    * profile.dig.impactRotationDegPerSecond;
  applyLayer(state.impactEcho, {
    texture: impactTexture,
    x: footprint.x,
    y: footprint.y,
    width: impactSize * echoScale,
    height: impactSize * echoScale,
    angleDeg: -rotation,
    depth: profile.depths.impactEcho,
    alpha: alpha * impactAlpha * profile.dig.impactEchoAlpha,
  });
  applyLayer(state.impact, {
    texture: impactTexture,
    x: footprint.x,
    y: footprint.y,
    width: impactSize,
    height: impactSize,
    angleDeg: rotation * 0.18,
    depth: profile.depths.impact,
    alpha: alpha * impactAlpha * profile.dig.impactAlpha,
  });
}

export function drawArcCoreSpriteArtwork(state, options) {
  const config = getArcCoreAnimationReviewMode(options.mode);
  const profile = profileFor(state, options.mode);
  if (!config || !profile || !state) return false;
  state.cloudBack.setVisible(false);
  state.cloudFront.setVisible(false);
  state.transitionGlyph.setVisible(false);

  const seconds = options.timeMs / 1000;
  const progress = clamp(options.progress);
  const timeline = profile.dig.timeline;
  const charge = options.active
    ? smooth((progress - timeline.chargeStart)
      / (timeline.chargePeak - timeline.chargeStart))
      * (1 - smooth((progress - timeline.beamEnd) / (1 - timeline.beamEnd)))
    : 0;
  const idlePhase = options.timeMs / profile.idle.bobPeriodMs * TAU;
  const breathPhase = options.timeMs
    / profile.idle.bodyBreathPeriodMs
    * TAU;
  const recoil = options.active
    ? Math.sin(smooth((progress - timeline.recoilStart)
      / (1 - timeline.recoilStart)) * Math.PI) * profile.dig.recoilPx
    : 0;
  const scaleMultiplier = options.scaleMultiplier ?? 1;
  const alpha = clamp(options.alpha ?? 1);
  const baseSize = profile.bodyDisplaySizePx * scaleMultiplier;
  const breath = Math.sin(breathPhase) * profile.idle.bodyBreathRatio;
  const anchor = {
    x: options.cx - options.direction.x * recoil,
    y: options.cy
      + (options.active ? 0 : Math.sin(idlePhase) * profile.idle.bobPx)
      - options.direction.y * recoil,
  };

  applyLayer(state.body, {
    texture: textureFor(state, profile.bodyRole),
    x: anchor.x,
    y: anchor.y,
    width: baseSize * (1 + breath),
    height: baseSize * (1 + breath),
    depth: profile.depths.body,
    alpha,
  });

  const energyScale = 1 + charge * profile.dig.energyScaleBoostRatio;
  const rotationBoost = progress * profile.dig.rotationBoostDeg;
  const energyTexture = textureFor(state, profile.energyRole);
  const commonEnergy = {
    texture: energyTexture,
    x: anchor.x,
    y: anchor.y,
    originX: profile.originX,
    originY: profile.originY,
  };
  applyLayer(state.energyGhost, {
    ...commonEnergy,
    width: baseSize * profile.idle.ghostEnergySizeRatio
      * (1 + Math.sin(idlePhase * 0.72) * profile.idle.ghostPulseRatio),
    height: baseSize * profile.idle.ghostEnergySizeRatio
      * (1 + Math.sin(idlePhase * 0.72) * profile.idle.ghostPulseRatio),
    angleDeg: seconds * profile.idle.ghostRotationDegPerSecond,
    depth: profile.depths.energyGhost,
    alpha: alpha * (profile.idle.ghostAlpha + charge * 0.16),
  });
  applyLayer(state.energyPrimary, {
    ...commonEnergy,
    width: baseSize * profile.idle.primaryEnergySizeRatio * energyScale,
    height: baseSize * profile.idle.primaryEnergySizeRatio * energyScale,
    angleDeg: seconds * profile.idle.primaryRotationDegPerSecond + rotationBoost,
    depth: profile.depths.energyPrimary,
    alpha: alpha * clamp(profile.idle.primaryAlpha
      + charge * profile.dig.energyAlphaBoost),
  });
  applyLayer(state.energySecondary, {
    ...commonEnergy,
    width: baseSize * profile.idle.secondaryEnergySizeRatio / energyScale,
    height: baseSize * profile.idle.secondaryEnergySizeRatio / energyScale,
    angleDeg: seconds * profile.idle.secondaryRotationDegPerSecond
      - rotationBoost * 0.72,
    depth: profile.depths.energySecondary,
    alpha: alpha * clamp(profile.idle.secondaryAlpha
      + charge * profile.dig.energyAlphaBoost * 0.72),
  });
  drawBeamAndImpact(state, profile, options, anchor, baseSize, alpha);
  state.activeProfileId = state.meta.packageId;
  return true;
}

export function drawArcCoreSpriteCloudTransition(state, options) {
  const profile = profileFor(state, options.mode);
  if (!profile || !state) return false;
  const envelopeValue = clamp(options.cloudEnvelope);
  const cloud = profile.cloud;
  const directionSign = options.kind === "enter" ? 1 : -1;
  const rotation = options.timeMs / 1000
    * cloud.rotationDegPerSecond * directionSign;
  const emergence = 0.28 + envelopeValue * 0.72;
  const pulse = 1 + Math.sin(options.progress * Math.PI * 3)
    * cloud.pulseScaleRatio * envelopeValue;
  const forward = Math.sin(options.progress * Math.PI)
    * cloud.displaySizePx * cloud.forwardRatio;
  const x = options.cx + options.direction.x * forward;
  const y = options.cy + options.direction.y * forward;
  const cloudTexture = textureFor(state, profile.cloudRole);

  applyLayer(state.cloudBack, {
    texture: cloudTexture,
    x,
    y,
    width: cloud.displaySizePx * cloud.backScale * emergence,
    height: cloud.displaySizePx * cloud.backScale * emergence,
    angleDeg: rotation,
    depth: profile.depths.cloudBack,
    alpha: envelopeValue * cloud.backAlpha,
  });
  applyLayer(state.transitionGlyph, {
    texture: textureFor(state, profile.energyRole),
    x,
    y,
    width: cloud.displaySizePx * cloud.glyphSizeRatio * pulse,
    height: cloud.displaySizePx * cloud.glyphSizeRatio * pulse,
    angleDeg: options.timeMs / 1000
      * cloud.glyphRotationDegPerSecond * directionSign,
    depth: profile.depths.transitionGlyph,
    alpha: envelopeValue * cloud.glyphAlpha,
  });
  applyLayer(state.cloudFront, {
    texture: cloudTexture,
    x,
    y,
    width: cloud.displaySizePx * cloud.frontScale * emergence,
    height: cloud.displaySizePx * cloud.frontScale * emergence,
    angleDeg: -rotation * 0.62,
    depth: profile.depths.cloudFront,
    alpha: envelopeValue * cloud.frontAlpha,
  });
  return true;
}
