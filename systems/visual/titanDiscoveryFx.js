import { TITAN_DISCOVERY_CONFIG } from "../../values/titanDiscoveries.js";
import { fitTitanChamberScale } from "./titanChamberGeometry.js?rev=20260729-native-density-v14";

function registerObject(registerTransient, gameObject) {
  if (gameObject) registerTransient?.(gameObject);
  return gameObject;
}

function destroyObject(releaseTransient, gameObject) {
  releaseTransient?.(gameObject);
  gameObject?.destroy?.();
}

function pulseLayer(scene, target, peakAlpha, duration, returnAlpha) {
  if (!target) return;
  scene.tweens.add({
    targets: target,
    alpha: peakAlpha,
    duration,
    ease: "Sine.Out",
    onComplete: () => scene.tweens.add({
      targets: target,
      alpha: returnAlpha,
      duration: Math.max(1, duration * 1.5),
      ease: "Sine.In",
    }),
  });
}

function createUnlockResonance(
  scene,
  view,
  definition,
  config,
  registerTransient,
  releaseTransient
) {
  const fx = config.unlockFx;
  const asset = config.assets[fx.resonanceAssetId];
  if (!asset || !scene.textures?.exists?.(asset.key)) return null;
  const resonance = registerObject(
    registerTransient,
    scene.add.image(
      view.baseX,
      view.chamberCenterY,
      asset.key
    )
  );
  const baseScale = fitTitanChamberScale(
    resonance,
    view.widthPx * fx.resonanceMaxWidthFraction,
    view.heightPx * fx.resonanceMaxHeightFraction,
    config.density.maxSourceScale
  );
  resonance
    .setDepth(fx.resonanceDepth)
    .setTint(definition.glowTint)
    .setBlendMode("ADD")
    .setAlpha(0)
    .setScale(baseScale * fx.resonanceStartScale);
  resonance.name = `titan-unlock-resonance-${definition.id}`;
  scene.tweens.add({
    targets: resonance,
    alpha: fx.resonancePeakAlpha,
    scaleX: baseScale * fx.resonancePeakScale,
    scaleY: baseScale * fx.resonancePeakScale,
    duration: fx.resonanceInMs,
    hold: fx.resonanceHoldMs,
    ease: "Cubic.Out",
    onComplete: () => scene.tweens.add({
      targets: resonance,
      alpha: 0,
      scaleX: baseScale * fx.resonanceEndScale,
      scaleY: baseScale * fx.resonanceEndScale,
      duration: fx.resonanceOutMs,
      ease: "Sine.Out",
      onComplete: () => destroyObject(releaseTransient, resonance),
    }),
  });
  return resonance;
}

export function playTitanUnlockFx(
  scene,
  view,
  definition,
  config = TITAN_DISCOVERY_CONFIG,
  registerTransient,
  releaseTransient
) {
  const underground = config.underground;
  const fx = config.unlockFx;
  const motionTargets = [view.sprite, view.glowSprite];
  const direction = definition.travelDirection || 1;
  view.animating = true;
  view.settledX = view.baseX;
  view.sprite
    .setPosition(view.baseX, view.baseY)
    .setScale(view.baseScale)
    .setAlpha(underground.peakAlpha);
  view.glowSprite
    .setPosition(view.baseX, view.baseY)
    .setScale(view.baseScale)
    .setAlpha(underground.peakAlpha);

  createUnlockResonance(
    scene,
    view,
    definition,
    config,
    registerTransient,
    releaseTransient
  );
  pulseLayer(
    scene,
    view.contactGlowSprite,
    fx.groundGlowPeakAlpha,
    fx.anticipationMs + fx.liftMs,
    underground.contactGlowAlpha
  );
  pulseLayer(
    scene,
    view.daisGlowSprite,
    fx.groundGlowPeakAlpha * 0.42,
    fx.anticipationMs + fx.liftMs,
    underground.daisGlowAlpha
  );
  pulseLayer(
    scene,
    view.chamberGlowSprite,
    fx.chamberGlowPeakAlpha,
    fx.anticipationMs + fx.liftMs,
    0
  );

  scene.tweens.add({
    targets: motionTargets,
    y: view.baseY + fx.compressionDropPx,
    scaleX: view.baseScale * fx.compressionScaleX,
    scaleY: view.baseScale * fx.compressionScaleY,
    duration: fx.anticipationMs,
    ease: "Quad.In",
    onComplete: () => {
      scene.tweens.add({
        targets: motionTargets,
        x: view.baseX + direction * fx.weightShiftPixels,
        y: view.baseY - fx.liftPixels,
        scaleX: view.baseScale * fx.liftScaleX,
        scaleY: view.baseScale * fx.liftScaleY,
        duration: fx.liftMs,
        ease: "Cubic.Out",
        onComplete: () => {
          scene.tweens.add({
            targets: motionTargets,
            x: view.baseX,
            y: view.baseY,
            scaleX: view.baseScale,
            scaleY: view.baseScale,
            duration: fx.settleMs,
            ease: "Back.Out",
            onComplete: () => {
              view.sprite
                .setPosition(view.baseX, view.baseY)
                .setScale(view.baseScale)
                .setAlpha(underground.discoveredAlpha);
              view.glowSprite
                .setPosition(view.baseX, view.baseY)
                .setScale(view.baseScale * fx.glowScale)
                .setAlpha(0);
              view.animating = false;
            },
          });
          scene.tweens.add({
            targets: view.glowSprite,
            alpha: 0,
            duration: fx.settleMs,
            ease: "Sine.Out",
          });
        },
      });
    },
  });
}
