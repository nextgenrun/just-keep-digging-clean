import { FREIGHT_LIFT_PROTOTYPE as CONFIG } from
  "../../../values/freightLiftPrototype.js";

export class FreightLiftPrototypeView {
  constructor(scene) {
    this.scene = scene;
    this.liftImage = null;
    this.statusText = null;
  }

  createShaft() {
    const world = CONFIG.world;
    this.scene.add.tileSprite(
      world.widthPx / 2,
      world.heightPx / 2,
      world.widthPx,
      world.heightPx,
      CONFIG.assets.background.key,
    )
      .setDepth(CONFIG.depth.background)
      .setAlpha(CONFIG.shaft.backdropAlpha);
    for (const wallX of [
      CONFIG.shaft.leftWallXPx,
      CONFIG.shaft.rightWallXPx,
    ]) {
      this.scene.add.tileSprite(
        wallX,
        world.heightPx / 2,
        CONFIG.shaft.wallWidthPx,
        world.heightPx,
        CONFIG.assets.foreground.key,
      )
        .setDepth(CONFIG.depth.shaft)
        .setAlpha(CONFIG.shaft.foregroundAlpha);
    }
  }

  createLandings() {
    const bodies = [];
    for (const stop of Object.values(CONFIG.stops)) {
      if (!stop?.platformYPx) continue;
      this.scene.add.text(
        CONFIG.shaft.centerXPx,
        stop.platformYPx - CONFIG.landings.imageYOffsetPx,
        stop.label,
        {
          fontFamily: "Consolas, monospace",
          fontSize: "22px",
          color: CONFIG.colors.uiAccent,
          stroke: CONFIG.colors.uiShadow,
          strokeThickness: 4,
        },
      ).setOrigin(0.5).setDepth(CONFIG.depth.landing);
      for (const centerX of [
        CONFIG.landings.leftCenterXPx,
        CONFIG.landings.rightCenterXPx,
      ]) {
        this.scene.add.image(
          centerX,
          stop.platformYPx + CONFIG.landings.imageYOffsetPx,
          CONFIG.assets.landing.key,
        )
          .setDisplaySize(
            CONFIG.landings.imageWidthPx,
            CONFIG.landings.imageHeightPx,
          )
          .setDepth(CONFIG.depth.landing);
        const body = this.scene.add.rectangle(
          centerX,
          stop.platformYPx + CONFIG.landings.heightPx / 2,
          CONFIG.landings.widthPx,
          CONFIG.landings.heightPx,
        ).setVisible(false);
        this.scene.physics.add.existing(body, true);
        bodies.push(body);
      }
    }
    return bodies;
  }

  createLift(platformY) {
    const lift = CONFIG.lift;
    this.liftImage = this.scene.add.sprite(
      CONFIG.shaft.centerXPx,
      platformY + lift.visualBottomOffsetPx,
      CONFIG.assets.lift.key,
      lift.dormantFrame,
    )
      .setOrigin(0.5, 1)
      .setDisplaySize(lift.displaySizePx, lift.displaySizePx)
      .setDepth(CONFIG.depth.lift);
    return this.liftImage;
  }

  createReviewUi() {
    this.scene.add.text(
      CONFIG.viewport.widthPx / 2,
      24,
      CONFIG.title,
      {
        fontFamily: "Consolas, monospace",
        fontSize: "24px",
        color: CONFIG.colors.uiText,
        stroke: CONFIG.colors.uiShadow,
        strokeThickness: 5,
      },
    ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(CONFIG.depth.ui);
    this.scene.add.text(
      CONFIG.viewport.widthPx / 2,
      58,
      `${CONFIG.copy.instruction}\n${CONFIG.copy.noJump}`,
      {
        fontFamily: "Consolas, monospace",
        fontSize: "16px",
        color: CONFIG.colors.uiMuted,
        stroke: CONFIG.colors.uiShadow,
        strokeThickness: 4,
        align: "center",
      },
    ).setOrigin(0.5, 0).setScrollFactor(0).setDepth(CONFIG.depth.ui);
    this.statusText = this.scene.add.text(
      CONFIG.viewport.widthPx / 2,
      CONFIG.viewport.heightPx - 34,
      "",
      {
        fontFamily: "Consolas, monospace",
        fontSize: "20px",
        color: CONFIG.colors.uiAccent,
        stroke: CONFIG.colors.uiShadow,
        strokeThickness: 5,
      },
    ).setOrigin(0.5, 1).setScrollFactor(0).setDepth(CONFIG.depth.ui);
  }

  setLiftPosition(platformY) {
    this.liftImage?.setPosition(
      CONFIG.shaft.centerXPx,
      platformY + CONFIG.lift.visualBottomOffsetPx,
    );
  }

  updateLiftFrame(phase, timeMs, phaseStartedAtMs, playerOnLift) {
    const lift = CONFIG.lift;
    let frame = lift.dormantFrame;
    if (phase === "activating") {
      const elapsed = timeMs - phaseStartedAtMs;
      const frameDuration = lift.activationDurationMs
        / lift.activationFrames.length;
      frame = lift.activationFrames[Math.min(
        lift.activationFrames.length - 1,
        Math.floor(elapsed / frameDuration),
      )];
    } else if (phase === "moving") {
      const index = Math.floor(
        (timeMs - phaseStartedAtMs) / lift.activeFramePeriodMs,
      ) % lift.activeFrames.length;
      frame = lift.activeFrames[index];
    } else if (phase === "resolved") {
      frame = lift.resolvedFrame;
    } else if (playerOnLift) {
      frame = lift.proximityFrame;
    }
    this.liftImage?.setFrame(frame);
  }

  updateStatus(phase, targetStop, playerOnLift) {
    if (phase === "moving") {
      const movingUp = targetStop?.id === CONFIG.stops.upper.id;
      this.statusText.setText(
        movingUp ? CONFIG.copy.travellingUp : CONFIG.copy.travellingDown,
      );
    } else if (phase === "resolved") {
      this.statusText.setText(CONFIG.copy.arrived);
    } else {
      this.statusText.setText(
        playerOnLift ? CONFIG.copy.ready : CONFIG.copy.noJump,
      );
    }
  }
}
