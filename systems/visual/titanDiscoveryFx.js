import { TITAN_DISCOVERY_CONFIG } from "../../values/titanDiscoveries.js";

function registerObject(registerTransient, gameObject) {
  if (gameObject) registerTransient?.(gameObject);
  return gameObject;
}

function destroyObject(releaseTransient, gameObject) {
  releaseTransient?.(gameObject);
  gameObject?.destroy?.();
}

function createUnlockRings(scene, view, definition, config, registerTransient, releaseTransient) {
  const fx = config.unlockFx;
  for (let index = 0; index < fx.ringCount; index += 1) {
    const ring = registerObject(
      registerTransient,
      scene.add.circle(
        view.baseX,
        view.baseY,
        fx.ringStartRadiusTiles * view.tileSize,
        definition.glowTint,
        0
      )
    );
    ring
      .setStrokeStyle(fx.ringLineWidth, definition.glowTint, fx.ringAlpha)
      .setDepth(fx.ringDepth)
      .setBlendMode("ADD")
      .setAlpha(fx.ringAlpha);
    scene.tweens.add({
      targets: ring,
      scaleX: fx.ringEndScale,
      scaleY: fx.ringEndScale,
      alpha: 0,
      delay: index * fx.ringStaggerMs,
      duration: fx.ringDurationMs,
      ease: "Sine.Out",
      onComplete: () => destroyObject(releaseTransient, ring),
    });
  }
}

function createUnlockDust(scene, view, definition, config, registerTransient, releaseTransient) {
  const fx = config.unlockFx;
  for (let index = 0; index < fx.dustCount; index += 1) {
    const fraction = (index + 0.5) / fx.dustCount;
    const radius = fx.dustRadiusMinPx + (index % 3) * fx.dustRadiusStepPx;
    const x = view.leftPx + view.widthPx * fraction;
    const y = view.topPx + radius;
    const dust = registerObject(
      registerTransient,
      scene.add.circle(x, y, radius, definition.glowTint, fx.ringAlpha)
    );
    dust.setDepth(fx.frontFxDepth).setBlendMode("ADD");
    scene.tweens.add({
      targets: dust,
      x: x + ((index % 3) - 1) * view.tileSize * fraction,
      y: y + (
        fx.dustFallMinTiles
        + fx.dustFallRangeTiles * fraction
      ) * view.tileSize,
      alpha: 0,
      duration: fx.dustDurationMinMs + index * fx.dustDurationStepMs,
      ease: "Quad.In",
      onComplete: () => destroyObject(releaseTransient, dust),
    });
  }
}

function createCollectionEcho(scene, view, definition, config, registerTransient, releaseTransient) {
  const fx = config.unlockFx;
  const echo = registerObject(
    registerTransient,
    scene.add.image(view.baseX, view.baseY, definition.asset.key)
  );
  echo
    .setDepth(fx.echoDepth)
    .setBlendMode("ADD")
    .setTint(definition.glowTint)
    .setAlpha(config.backdrop.peakAlpha)
    .setScale(view.baseScale * fx.echoStartScale);
  scene.tweens.add({
    targets: echo,
    y: view.baseY - fx.echoHeightTiles * view.tileSize,
    scaleX: view.baseScale * fx.echoEndScale,
    scaleY: view.baseScale * fx.echoEndScale,
    alpha: 0,
    duration: fx.echoDurationMs,
    ease: "Sine.Out",
    onComplete: () => destroyObject(releaseTransient, echo),
  });
}

export function playTitanUnlockFx(
  scene,
  view,
  definition,
  config = TITAN_DISCOVERY_CONFIG,
  registerTransient,
  releaseTransient
) {
  const backdrop = config.backdrop;
  const fx = config.unlockFx;
  view.animating = true;
  view.glowSprite
    .setAlpha(backdrop.peakAlpha)
    .setScale(view.baseScale);

  scene.tweens.add({
    targets: [view.sprite, view.glowSprite],
    alpha: backdrop.peakAlpha,
    scaleX: view.baseScale * fx.peakScale,
    scaleY: view.baseScale * fx.peakScale,
    duration: fx.glowInMs,
    ease: "Sine.Out",
    onComplete: () => {
      view.settledX = view.baseX + definition.travelDirection
        * definition.travelTiles
        * view.tileSize;
      scene.tweens.add({
        targets: view.sprite,
        x: view.settledX,
        alpha: backdrop.discoveredAlpha,
        scaleX: view.baseScale,
        scaleY: view.baseScale,
        duration: fx.crossingMs,
        ease: "Sine.InOut",
        onComplete: () => {
          view.animating = false;
        },
      });
      scene.tweens.add({
        targets: view.glowSprite,
        x: view.settledX,
        alpha: 0,
        scaleX: view.baseScale * fx.glowScale,
        scaleY: view.baseScale * fx.glowScale,
        duration: fx.crossingMs,
        ease: "Sine.Out",
      });
    },
  });

  createUnlockRings(scene, view, definition, config, registerTransient, releaseTransient);
  createUnlockDust(scene, view, definition, config, registerTransient, releaseTransient);
  createCollectionEcho(scene, view, definition, config, registerTransient, releaseTransient);
}
