function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, Number(value) || 0));
}

function showAwarenessLabel(scene, awareness, message) {
  if (!scene?.add?.text) return false;
  const width = Number(scene.scale?.width) || Number(scene.cameras?.main?.width) || 1_920;
  const label = scene.add.text(width / 2, awareness.messageYpx, message, {
    fontFamily: awareness.messageFontFamily,
    fontSize: `${awareness.messageFontSizePx}px`,
    fontStyle: "bold",
    color: awareness.messageColor,
    stroke: awareness.messageStrokeColor,
    strokeThickness: awareness.messageStrokeThickness,
    align: "center",
  }).setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(awareness.messageDepth)
    .setAlpha(0)
    .setScale(awareness.messageInitialScale);
  label.setLetterSpacing?.(awareness.messageLetterSpacingPx);

  scene.tweens?.add?.({
    targets: label,
    alpha: 1,
    scaleX: 1,
    scaleY: 1,
    duration: awareness.messageEnterMs,
    ease: "Power2.Out",
  });
  scene.time?.delayedCall?.(
    Math.max(0, awareness.messageDurationMs - awareness.messageFadeMs),
    () => {
      if (label.active === false) return;
      if (!scene.tweens?.add) {
        label.destroy?.();
        return;
      }
      scene.tweens.add({
        targets: label,
        alpha: 0,
        y: label.y - 6,
        duration: awareness.messageFadeMs,
        ease: "Sine.In",
        onComplete: () => label.destroy?.(),
      });
    },
  );
  return true;
}

export function playShadowMinerArrivalAwareness(
  scene,
  config,
  pose,
  visualIntensity = 1,
) {
  const awareness = config?.visual?.awareness;
  if (!awareness?.enabled || !pose) return null;
  const direction = pose.x < (scene?.player?.x || 0) ? "left" : "right";
  const flashAlpha = clamp(
    awareness.flashAlpha * Math.max(1, Number(visualIntensity) || 1),
    awareness.flashAlpha,
    awareness.flashMaximumAlpha,
  );
  const message = direction === "left"
    ? `${awareness.leftPrefix}${awareness.message}`
    : `${awareness.message}${awareness.rightSuffix}`;
  scene?.screenFlashSystem?.flashCustom?.(
    awareness.flashColor,
    flashAlpha,
    awareness.flashDurationMs,
  );
  const labelCreated = showAwarenessLabel(scene, awareness, message);
  if (!labelCreated) {
    scene?.hudSystem?.flashStatus?.(
      message,
      awareness.messageColor,
      awareness.messageDurationMs,
    );
  }
  return Object.freeze({
    direction,
    flashAlpha,
    message,
    labelCreated,
    atMs: scene?.time?.now || 0,
  });
}
