export function createWorldLayers(scene, config) {
  const { viewport, world, layers, hazard, assets, player } = config;
  scene.background = scene.add
    .image(viewport.width / 2, viewport.height / 2, assets.background.key)
    .setDisplaySize(viewport.width, viewport.height)
    .setAlpha(world.backgroundAlpha)
    .setTint(world.backgroundTint)
    .setDepth(layers.background);

  scene.footprint = scene.add
    .image(world.targetX, world.floorY - 2, assets.landingFootprint.key)
    .setDisplaySize(
      hazard.landingFootprintWidth,
      hazard.landingFootprintHeight,
    )
    .setDepth(layers.landingFootprint);

  scene.ceilingFracture = scene.add
    .image(world.targetX, world.ceilingY, assets.ceilingFracture.key)
    .setDisplaySize(
      hazard.ceilingFractureWidth,
      hazard.ceilingFractureHeight,
    )
    .setDepth(layers.ceilingFracture);

  scene.player = scene.add
    .sprite(world.playerStartX, world.floorY, assets.playerIdle.key)
    .setOrigin(0.5, 0.9)
    .setDisplaySize(player.displaySize, player.displaySize)
    .setDepth(layers.player);

  scene.rock = scene.add
    .image(world.targetX, world.ceilingY, assets.fallingBoulder.key)
    .setDisplaySize(
      hazard.fallingBoulderWidth,
      hazard.fallingBoulderHeight,
    )
    .setDepth(layers.fallingBoulder)
    .setVisible(false);

  scene.impact = scene.add
    .image(world.targetX, world.floorY - 42, assets.impactDebris.key)
    .setOrigin(0.5, 0.72)
    .setDisplaySize(hazard.impactDebrisWidth, hazard.impactDebrisHeight)
    .setDepth(layers.foregroundDebris)
    .setVisible(false);

  scene.tweens.add({
    targets: scene.footprint,
    alpha: hazard.footprintMinAlpha,
    scaleX: 0.94,
    scaleY: 0.94,
    duration: hazard.warningPulseMs,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });
  scene.tweens.add({
    targets: scene.ceilingFracture,
    alpha: hazard.seamMinAlpha,
    duration: hazard.warningPulseMs,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });
}

export function createHud(scene, config) {
  const { hud, layers, assets, controls } = config;
  scene.statusFrame = scene.add
    .image(hud.x, hud.y, assets.statusFrame.key)
    .setDisplaySize(hud.frameWidth, hud.frameHeight)
    .setDepth(layers.hud);
  scene.medallion = scene.add
    .image(hud.medallionX, hud.y, assets.medallion.key)
    .setDisplaySize(hud.medallionSize, hud.medallionSize)
    .setDepth(layers.hud + 1);
  scene.titleText = scene.add
    .text(hud.textX, hud.titleY, "", {
      font: hud.titleFont,
      color: hud.titleColor,
    })
    .setOrigin(0, 0.5)
    .setDepth(layers.hud + 1);
  scene.detailText = scene.add
    .text(hud.textX, hud.detailY, "", {
      font: hud.detailFont,
      color: hud.detailColor,
    })
    .setOrigin(0, 0.5)
    .setDepth(layers.hud + 1);
  scene.layerLabel = scene.add
    .text(
      hud.shotLabelX,
      hud.shotLabelY,
      "FOOTPRINT 18  ·  PLAYER 20  ·  BOULDER 22  ·  DEBRIS 25",
      {
        font: hud.shotLabelFont,
        color: hud.shotLabelColor,
      },
    )
    .setDepth(layers.hud);
  scene.controlLabel = scene.add
    .text(
      config.viewport.width - hud.shotLabelX,
      hud.shotLabelY,
      `${controls.left}/${controls.right} MOVE  ·  ${controls.flight} FLIGHT  ·  R RESET`,
      {
        font: hud.shotLabelFont,
        color: hud.shotLabelColor,
      },
    )
    .setOrigin(1, 0)
    .setDepth(layers.hud);
}

export function setStatus(scene, title, detail) {
  scene.titleText.setText(title);
  scene.detailText.setText(detail);
}

export function rockY(config, progress) {
  const { world, hazard } = config;
  const start = world.ceilingY + hazard.fallingBoulderHeight * 0.34;
  const end = world.floorY - hazard.fallingBoulderHeight * 0.48;
  return Phaser.Math.Linear(
    start,
    end,
    Phaser.Math.Clamp(progress, 0, 1),
  );
}

export function applyStaticShot(scene, config, shot) {
  const { hazard, world } = config;
  scene.player.setPosition(shot.playerX, shot.playerY);
  scene.footprint.setAlpha(shot.footprintAlpha);
  scene.ceilingFracture.setAlpha(shot.seamAlpha);
  scene.rock
    .setPosition(world.targetX, rockY(config, shot.rockProgress))
    .setRotation(hazard.rockRotation * shot.rockProgress)
    .setVisible(shot.rockProgress > 0 && shot.rockProgress < 1);
  scene.impact
    .setDisplaySize(hazard.impactDebrisWidth, hazard.impactDebrisHeight)
    .setAlpha(shot.impactAlpha)
    .setVisible(shot.impactAlpha > 0);
  setStatus(scene, shot.title, shot.detail);
}
