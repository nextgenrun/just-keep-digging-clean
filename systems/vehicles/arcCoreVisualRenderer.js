import { ASSET_KEYS } from "../../values/assetKeys.js";
import { ARC_CORE_VISUAL_PACK } from "../../values/arcCoreVisualAssets.js?rev=20260728-arc-core-dig-repair-v4";
import { getArcCoreVisualMode } from "../../values/arcCoreVisualConfig.js";
import {
  drawArcCoreActionVisuals,
} from "./arcCoreActionVisuals.js";
import {
  applyArcCoreLayer,
  arcCoreEnvelope,
  clampArcCoreValue,
  createArcCoreLayer,
  hideArcCoreLayers,
  smoothArcCoreValue,
  textureForArcCoreRole,
} from "./arcCoreLayerPlacement.js";
import { resolveArcCoreCollisionProfile } from "./arcCoreCollisionProfile.js";

const TAU = Math.PI * 2;

function buildRoleMap(manifest) {
  const section = manifest?.[ARC_CORE_VISUAL_PACK.assetSection];
  if (!Array.isArray(section?.files)) {
    throw new Error("Arc Core .sprite pack is missing its asset section");
  }
  return Object.fromEntries(section.files.map(file => [file.role, file.key]));
}

function queueArcCoreRoleAssets(scene, manifest, rootPrefix) {
  const section = manifest?.[ARC_CORE_VISUAL_PACK.assetSection];
  if (!Array.isArray(section?.files) || typeof section.path !== "string") {
    throw new Error("Arc Core .sprite asset paths are missing");
  }
  for (const file of section.files) {
    if (file.type !== "image" || !file.key || !file.url) {
      throw new Error("Arc Core .sprite contains an unsupported production asset");
    }
    scene.load.image(file.key, `${rootPrefix}${section.path}${file.url}`);
  }
}

export function preloadArcCoreVisualAssets(scene, rootPrefix = "") {
  scene.load.once(
    `filecomplete-json-${ASSET_KEYS.vehicles.arcCore.pack}`,
    (_key, _type, manifest) => {
      queueArcCoreRoleAssets(scene, manifest, rootPrefix);
    },
  );
  scene.load.json(
    ASSET_KEYS.vehicles.arcCore.pack,
    `${rootPrefix}${ARC_CORE_VISUAL_PACK.path}?rev=${ARC_CORE_VISUAL_PACK.revision}`,
  );
  scene.load.image(
    ASSET_KEYS.vehicles.arcCore.reviewStage,
    `${rootPrefix}${ARC_CORE_VISUAL_PACK.reviewStagePath}`,
  );
}

export function createArcCoreVisualLayers(scene) {
  const manifest = scene.cache.json.get(ASSET_KEYS.vehicles.arcCore.pack);
  const meta = manifest?.[ARC_CORE_VISUAL_PACK.metaSection];
  if (!meta?.approved || meta.reviewOnly || meta.productionChanged !== true) {
    throw new Error("Arc Core .sprite pack is not production-approved");
  }
  if (meta.pipeline !== "piskel-roundtrip") {
    throw new Error("Arc Core artwork did not pass through Piskel");
  }
  if (
    Object.keys(meta.modes || {}).length !== 2
    || Object.values(meta.modes).some(
      profile => resolveArcCoreCollisionProfile(profile, meta) === null,
    )
  ) {
    throw new Error("Arc Core .sprite collision profiles are invalid");
  }
  const blend = globalThis.Phaser?.BlendModes || {};
  const roles = buildRoleMap(manifest);
  return {
    manifest,
    meta,
    roles,
    body: createArcCoreLayer(scene, roles["small.body"]),
    energyGhost: createArcCoreLayer(scene, roles["small.ring"], blend.SCREEN),
    energyPrimary: createArcCoreLayer(scene, roles["small.ring"], blend.ADD),
    energySecondary: createArcCoreLayer(scene, roles["small.ring"], blend.ADD),
    beam: createArcCoreLayer(scene, roles["small.beam"], blend.ADD),
    impactEcho: createArcCoreLayer(scene, roles["small.impact"], blend.SCREEN),
    impact: createArcCoreLayer(scene, roles["small.impact"], blend.ADD),
    cloudBack: createArcCoreLayer(scene, roles["small.cloud"], blend.SCREEN),
    transitionGlyph: createArcCoreLayer(scene, roles["small.ring"], blend.ADD),
    cloudFront: createArcCoreLayer(scene, roles["small.cloud"], blend.ADD),
    activeProfileId: null,
  };
}

export function hideArcCoreVisualLayers(state) {
  hideArcCoreLayers(state, [
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
  ]);
}

function profileFor(state, modeId) {
  return state?.meta?.modes?.[modeId] || null;
}


export function drawArcCoreVisualArtwork(state, options) {
  const config = getArcCoreVisualMode(options.mode);
  const profile = profileFor(state, options.mode);
  const tuning = state?.meta?.renderTuning;
  if (!config || !profile || !tuning || !state) return false;
  state.cloudBack.setVisible(false);
  state.cloudFront.setVisible(false);
  state.transitionGlyph.setVisible(false);

  const seconds = options.timeMs / 1000;
  const progress = clampArcCoreValue(options.progress);
  const timeline = profile.dig.timeline;
  const charge = options.active
    ? smoothArcCoreValue((progress - timeline.chargeStart)
      / (timeline.chargePeak - timeline.chargeStart))
      * (1 - smoothArcCoreValue(
        (progress - timeline.beamEnd) / (1 - timeline.beamEnd),
      ))
    : 0;
  const idlePhase = options.timeMs / profile.idle.bobPeriodMs * TAU;
  const breathPhase = options.timeMs
    / profile.idle.bodyBreathPeriodMs
    * TAU;
  const direction = options.direction || { x: 1, y: 0 };
  const bodyMotion = profile.dig.bodyMotion || {};
  const brace = options.active
    ? arcCoreEnvelope(
      progress,
      timeline.chargeStart,
      timeline.chargePeak,
      timeline.impactStart,
    )
    : 0;
  const contact = options.active
    ? arcCoreEnvelope(
      progress,
      timeline.beamStart,
      timeline.impactPeak,
      timeline.impactEnd,
    )
    : 0;
  const breakPulse = options.active
    ? arcCoreEnvelope(
      progress,
      timeline.impactStart,
      timeline.impactPeak,
      timeline.impactEnd,
    )
    : 0;
  const recoilPeak = timeline.recoilStart
    + (1 - timeline.recoilStart) * 0.34;
  const recoil = options.active
    ? arcCoreEnvelope(
      progress,
      timeline.recoilStart,
      recoilPeak,
      1,
    ) * profile.dig.recoilPx
    : 0;
  const scaleMultiplier = options.scaleMultiplier ?? 1;
  const alpha = clampArcCoreValue(options.alpha ?? 1);
  const tint = options.tint ?? 0xffffff;
  const energyAlphaMultiplier = options.energyAlphaMultiplier ?? 1;
  const baseSize = profile.bodyDisplaySizePx * scaleMultiplier;
  const breath = Math.sin(breathPhase) * profile.idle.bodyBreathRatio;
  const alongOffset = -brace * (bodyMotion.bracePullbackPx || 0)
    + contact * (bodyMotion.contactDrivePx || 0)
    - breakPulse * (bodyMotion.breakKickPx || 0)
    - recoil;
  const alongScale = 1
    - brace * (bodyMotion.compressAlongRatio || 0)
    + contact * (bodyMotion.contactStretchRatio || 0)
    - breakPulse * (bodyMotion.breakScaleRatio || 0) * 0.45;
  const crossScale = 1
    + brace * (bodyMotion.expandCrossRatio || 0)
    + breakPulse * (bodyMotion.breakScaleRatio || 0);
  const horizontalAction = Math.abs(direction.x) >= Math.abs(direction.y);
  const torqueSign = direction.x !== 0 ? direction.x : -direction.y;
  const bodyAngleDeg = (
    brace - breakPulse * 0.45
  ) * (bodyMotion.torqueDeg || 0) * torqueSign;
  const anchor = {
    x: options.cx + direction.x * alongOffset,
    y: options.cy
      + (options.active ? 0 : Math.sin(idlePhase) * profile.idle.bobPx)
      + direction.y * alongOffset,
  };

  applyArcCoreLayer(state.body, {
    texture: textureForArcCoreRole(state, profile.bodyRole),
    x: anchor.x,
    y: anchor.y,
    width: baseSize * (1 + breath)
      * (horizontalAction ? alongScale : crossScale),
    height: baseSize * (1 + breath)
      * (horizontalAction ? crossScale : alongScale),
    angleDeg: bodyAngleDeg,
    depth: profile.depths.body,
    alpha,
    tint,
    visibleAlphaThreshold: tuning.visibleAlphaThreshold,
  });

  const energyScale = 1 + charge * profile.dig.energyScaleBoostRatio;
  const rotationBoost = progress * profile.dig.rotationBoostDeg;
  const energyTexture = textureForArcCoreRole(state, profile.energyRole);
  const ghostSizeRatio = profile.idle.ghostEnergySizeRatio
    + charge * profile.dig.ghostChargeSizeBoostRatio;
  const commonEnergy = {
    texture: energyTexture,
    x: anchor.x,
    y: anchor.y,
    originX: profile.originX,
    originY: profile.originY,
  };
  applyArcCoreLayer(state.energyGhost, {
    ...commonEnergy,
    width: baseSize * ghostSizeRatio
      * (1 + Math.sin(idlePhase * tuning.idleGhostPhaseRatio)
        * profile.idle.ghostPulseRatio),
    height: baseSize * ghostSizeRatio
      * (1 + Math.sin(idlePhase * tuning.idleGhostPhaseRatio)
        * profile.idle.ghostPulseRatio),
    angleDeg: seconds * profile.idle.ghostRotationDegPerSecond,
    depth: profile.depths.energyGhost,
    alpha: alpha * energyAlphaMultiplier
      * (profile.idle.ghostAlpha + charge * tuning.chargeGhostAlpha),
    tint,
    visibleAlphaThreshold: tuning.visibleAlphaThreshold,
  });
  applyArcCoreLayer(state.energyPrimary, {
    ...commonEnergy,
    width: baseSize * profile.idle.primaryEnergySizeRatio * energyScale,
    height: baseSize * profile.idle.primaryEnergySizeRatio * energyScale,
    angleDeg: seconds * profile.idle.primaryRotationDegPerSecond + rotationBoost,
    depth: profile.depths.energyPrimary,
    alpha: alpha * energyAlphaMultiplier
      * clampArcCoreValue(profile.idle.primaryAlpha
        + charge * profile.dig.energyAlphaBoost),
    tint,
    visibleAlphaThreshold: tuning.visibleAlphaThreshold,
  });
  applyArcCoreLayer(state.energySecondary, {
    ...commonEnergy,
    width: baseSize * profile.idle.secondaryEnergySizeRatio / energyScale,
    height: baseSize * profile.idle.secondaryEnergySizeRatio / energyScale,
    angleDeg: seconds * profile.idle.secondaryRotationDegPerSecond
      - rotationBoost * tuning.secondaryRotationBoostRatio,
    depth: profile.depths.energySecondary,
    alpha: alpha * energyAlphaMultiplier
      * clampArcCoreValue(profile.idle.secondaryAlpha
        + charge * profile.dig.energyAlphaBoost
          * tuning.secondaryChargeBoostRatio),
    tint,
    visibleAlphaThreshold: tuning.visibleAlphaThreshold,
  });
  drawArcCoreActionVisuals(
    state,
    profile,
    tuning,
    options,
    anchor,
    baseSize,
    alpha,
  );
  state.activeProfileId = state.meta.packageId;
  return true;
}

export function drawArcCoreVisualCloudTransition(state, options) {
  const profile = profileFor(state, options.mode);
  const tuning = state?.meta?.renderTuning;
  if (!profile || !tuning || !state) return false;
  const envelopeValue = clampArcCoreValue(options.cloudEnvelope);
  const cloud = profile.cloud;
  const directionSign = options.kind === "enter" ? 1 : -1;
  const rotation = options.timeMs / 1000
    * cloud.rotationDegPerSecond * directionSign;
  const emergence = tuning.cloudEmergenceMin
    + envelopeValue * tuning.cloudEmergenceRange;
  const pulse = 1 + Math.sin(options.progress * Math.PI * 3)
    * cloud.pulseScaleRatio * envelopeValue;
  const forward = Math.sin(options.progress * Math.PI)
    * cloud.displaySizePx * cloud.forwardRatio;
  const x = options.cx + options.direction.x * forward;
  const y = options.cy + options.direction.y * forward;
  const cloudTexture = textureForArcCoreRole(state, profile.cloudRole);

  applyArcCoreLayer(state.cloudBack, {
    texture: cloudTexture,
    x,
    y,
    width: cloud.displaySizePx * cloud.backScale * emergence,
    height: cloud.displaySizePx * cloud.backScale * emergence,
    angleDeg: rotation,
    depth: profile.depths.cloudBack,
    alpha: envelopeValue * cloud.backAlpha,
    visibleAlphaThreshold: tuning.visibleAlphaThreshold,
  });
  applyArcCoreLayer(state.transitionGlyph, {
    texture: textureForArcCoreRole(state, profile.energyRole),
    x,
    y,
    width: cloud.displaySizePx * cloud.glyphSizeRatio * pulse,
    height: cloud.displaySizePx * cloud.glyphSizeRatio * pulse,
    angleDeg: options.timeMs / 1000
      * cloud.glyphRotationDegPerSecond * directionSign,
    depth: profile.depths.transitionGlyph,
    alpha: envelopeValue * cloud.glyphAlpha,
    visibleAlphaThreshold: tuning.visibleAlphaThreshold,
  });
  applyArcCoreLayer(state.cloudFront, {
    texture: cloudTexture,
    x,
    y,
    width: cloud.displaySizePx * cloud.frontScale * emergence,
    height: cloud.displaySizePx * cloud.frontScale * emergence,
    angleDeg: -rotation * tuning.cloudFrontCounterRotationRatio,
    depth: profile.depths.cloudFront,
    alpha: envelopeValue * cloud.frontAlpha,
    visibleAlphaThreshold: tuning.visibleAlphaThreshold,
  });
  return true;
}
