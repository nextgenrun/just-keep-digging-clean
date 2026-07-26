import {
  ARC_CORE_ANIMATION_REVIEW,
  getArcCoreAnimationReviewMode,
} from "../../../values/arcCoreAnimationReview.js";
import {
  ARC_CORE_SPRITE_REVIEW_PACK,
} from "../../../values/arcCoreSpriteReview.js";
import {
  drawArcCoreSpriteEnergy,
} from "./arcCoreSpriteEnergyRenderer.js";

const ROOT_PREFIX = "../../../";
const TAU = Math.PI * 2;

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function smooth(value) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

function buildRoleMap(manifest) {
  const section = manifest?.[ARC_CORE_SPRITE_REVIEW_PACK.assetSection];
  if (!Array.isArray(section?.files)) {
    throw new Error("Arc Core .sprite pack is missing its asset section");
  }
  return Object.fromEntries(
    section.files.map(file => [file.role, file.key]),
  );
}

function createLayer(scene, texture, blendMode) {
  const layer = scene.add.sprite(0, 0, texture);
  layer.setVisible(false);
  if (blendMode !== undefined) layer.setBlendMode(blendMode);
  return layer;
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
  const blendModes = globalThis.Phaser?.BlendModes || {};
  const roles = buildRoleMap(manifest);
  return {
    manifest,
    meta,
    roles,
    body: createLayer(scene, roles["small.body"]),
    energyPrimary: createLayer(scene, roles["small.ring"]),
    energySecondary: createLayer(
      scene,
      roles["small.ring"],
      blendModes.ADD,
    ),
    cloudBack: createLayer(
      scene,
      roles["small.cloud"],
      blendModes.SCREEN,
    ),
    cloudFront: createLayer(
      scene,
      roles["small.cloud"],
      blendModes.ADD,
    ),
    activeProfileId: null,
  };
}

export function hideArcCoreSpriteArtwork(state) {
  if (!state) return;
  state.body?.setVisible(false);
  state.energyPrimary?.setVisible(false);
  state.energySecondary?.setVisible(false);
  state.cloudBack?.setVisible(false);
  state.cloudFront?.setVisible(false);
}

function profileFor(state, modeId) {
  return state?.meta?.modes?.[modeId] || null;
}

function textureFor(state, role) {
  const texture = state?.roles?.[role];
  if (!texture) throw new Error(`Arc Core .sprite role is missing: ${role}`);
  return texture;
}

function applyLayer(layer, options) {
  const visible = options.alpha > 0.002;
  layer
    .setTexture(options.texture)
    .setOrigin(options.originX, options.originY)
    .setPosition(options.x, options.y)
    .setDisplaySize(options.width, options.height)
    .setAngle(options.angleDeg)
    .setDepth(options.depth)
    .setAlpha(options.alpha)
    .setVisible(visible);
}

export function drawArcCoreSpriteArtwork(state, g, options) {
  const config = getArcCoreAnimationReviewMode(options.mode);
  const profile = profileFor(state, options.mode);
  if (!config || !profile || !state) return false;

  state.cloudBack.setVisible(false);
  state.cloudFront.setVisible(false);
  const timeSeconds = options.timeMs / 1000;
  const progress = clamp(options.progress);
  const activeEnvelope = options.active ? smooth(progress / 0.24) : 0;
  const idlePhase = options.timeMs / profile.idle.bobPeriodMs * TAU;
  const breathPhase = options.timeMs
    / profile.idle.bodyBreathPeriodMs
    * TAU;
  const bob = options.active ? 0 : Math.sin(idlePhase) * profile.idle.bobPx;
  const recoilEnvelope = options.active
    ? Math.sin(clamp((progress - 0.68) / 0.32) * Math.PI)
    : 0;
  const recoil = recoilEnvelope * profile.dig.recoilPx;
  const digPulse = options.active ? Math.sin(progress * Math.PI) : 0;
  const scaleMultiplier = options.scaleMultiplier ?? 1;
  const alpha = clamp(options.alpha ?? 1);
  const size = profile.bodyDisplaySizePx * scaleMultiplier;
  const breath = Math.sin(breathPhase) * profile.idle.bodyBreathRatio;
  const anchor = {
    x: options.cx - options.direction.x * recoil,
    y: options.cy + bob - options.direction.y * recoil,
  };

  drawArcCoreSpriteEnergy(
    g,
    config,
    profile,
    { ...options, alpha },
    anchor,
    size,
  );
  applyLayer(state.body, {
    texture: textureFor(state, profile.bodyRole),
    x: anchor.x,
    y: anchor.y,
    width: size * (
      1 + breath + digPulse * profile.dig.squashWidthRatio
    ),
    height: size * (
      1 + breath + digPulse * profile.dig.squashHeightRatio
    ),
    angleDeg: 0,
    originX: profile.originX,
    originY: profile.originY,
    depth: profile.depths.body,
    alpha,
  });

  const energyBoost = 1
    + digPulse * profile.dig.energyScaleBoostRatio;
  const rotationBoost = progress * profile.dig.rotationBoostDeg;
  const energyAlphaBoost = activeEnvelope * profile.dig.energyAlphaBoost;
  const energyTexture = textureFor(state, profile.energyRole);
  applyLayer(state.energyPrimary, {
    texture: energyTexture,
    x: anchor.x,
    y: anchor.y,
    width: size * profile.idle.primaryEnergySizeRatio * energyBoost,
    height: size * profile.idle.primaryEnergySizeRatio * energyBoost,
    angleDeg: timeSeconds
      * profile.idle.primaryRotationDegPerSecond
      + rotationBoost,
    originX: profile.originX,
    originY: profile.originY,
    depth: profile.depths.energyPrimary,
    alpha: alpha * clamp(
      profile.idle.primaryAlpha + energyAlphaBoost,
    ),
  });
  applyLayer(state.energySecondary, {
    texture: energyTexture,
    x: anchor.x,
    y: anchor.y,
    width: size * profile.idle.secondaryEnergySizeRatio / energyBoost,
    height: size * profile.idle.secondaryEnergySizeRatio / energyBoost,
    angleDeg: timeSeconds
      * profile.idle.secondaryRotationDegPerSecond
      - rotationBoost * 0.72,
    originX: profile.originX,
    originY: profile.originY,
    depth: profile.depths.energySecondary,
    alpha: alpha * clamp(
      profile.idle.secondaryAlpha + energyAlphaBoost * 0.72,
    ),
  });
  state.activeProfileId = state.meta.packageId;
  return true;
}

export function drawArcCoreSpriteCloudTransition(state, options) {
  const profile = profileFor(state, options.mode);
  if (!profile || !state) return false;
  const envelope = clamp(options.cloudEnvelope);
  const cloud = profile.cloud;
  const directionSign = options.kind === "enter" ? 1 : -1;
  const rotation = options.timeMs
    / 1000
    * cloud.rotationDegPerSecond
    * directionSign;
  const texture = textureFor(state, profile.cloudRole);
  const emergence = 0.3 + envelope * 0.7;
  const forward = Math.sin(options.progress * Math.PI) * cloud.displaySizePx * 0.035;
  const x = options.cx + options.direction.x * forward;
  const y = options.cy + options.direction.y * forward;

  applyLayer(state.cloudBack, {
    texture,
    x,
    y,
    width: cloud.displaySizePx * cloud.backScale * emergence,
    height: cloud.displaySizePx * cloud.backScale * emergence,
    angleDeg: rotation,
    originX: profile.originX,
    originY: profile.originY,
    depth: profile.depths.cloudBack,
    alpha: envelope * cloud.backAlpha,
  });
  applyLayer(state.cloudFront, {
    texture,
    x,
    y,
    width: cloud.displaySizePx * cloud.frontScale * emergence,
    height: cloud.displaySizePx * cloud.frontScale * emergence,
    angleDeg: -rotation * 0.62,
    originX: profile.originX,
    originY: profile.originY,
    depth: profile.depths.cloudFront,
    alpha: envelope * cloud.frontAlpha,
  });
  return true;
}
