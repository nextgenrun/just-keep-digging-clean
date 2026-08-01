import { FREIGHT_LIFT_PROTOTYPE as CONFIG } from
  "../../../values/freightLiftPrototype.js";
import { FreightLiftPrototypeView } from "./FreightLiftPrototypeView.js";

export class FreightLiftPrototypeScene extends Phaser.Scene {
  constructor() {
    super("FreightLiftPrototypeV1");
    this.liftPlatformY = CONFIG.stops.lower.platformYPx;
    this.liftSpeed = 0;
    this.targetStop = null;
    this.phase = "idle";
    this.phaseStartedAtMs = 0;
  }

  preload() {
    const assets = CONFIG.assets;
    this.load.image(assets.background.key, assets.background.path);
    this.load.image(assets.foreground.key, assets.foreground.path);
    this.load.image(assets.landing.key, assets.landing.path);
    this.load.spritesheet(assets.lift.key, assets.lift.path, {
      frameWidth: assets.lift.frameWidthPx,
      frameHeight: assets.lift.frameHeightPx,
      endFrame: assets.lift.endFrame,
    });
    this.load.spritesheet(assets.player.key, assets.player.path, {
      frameWidth: assets.player.frameWidthPx,
      frameHeight: assets.player.frameHeightPx,
      endFrame: assets.player.endFrame,
    });
  }

  create() {
    this.physics.world.setBounds(
      0,
      0,
      CONFIG.world.widthPx,
      CONFIG.world.heightPx,
    );
    this.view = new FreightLiftPrototypeView(this);
    this.view.createShaft();
    this.landingBodies = this.view.createLandings();
    this._createLiftPlatform();
    this.view.createLift(this.liftPlatformY);
    this._createPlayer();
    this.view.createReviewUi();
    this._createInput();
    this._configureCamera();
    this._resetPrototype();
  }

  update(timeMs, deltaMs) {
    const deltaSeconds = deltaMs / 1000;
    if (Phaser.Input.Keyboard.JustDown(this.keys.reset)) {
      this._resetPrototype();
      return;
    }
    this._updatePlayerMovement();
    if (Phaser.Input.Keyboard.JustDown(this.keys.interact)) {
      this._tryStartRide(timeMs);
    }
    this._updateLift(timeMs, deltaSeconds);
    const playerOnLift = this._isPlayerOnLift();
    this.view.updateLiftFrame(
      this.phase,
      timeMs,
      this.phaseStartedAtMs,
      playerOnLift,
    );
    this.view.updateStatus(this.phase, this.targetStop, playerOnLift);
  }

  _createLiftPlatform() {
    const lift = CONFIG.lift;
    this.liftPlatform = this.add.rectangle(
      CONFIG.shaft.centerXPx,
      this.liftPlatformY + lift.platformHeightPx / 2,
      lift.platformWidthPx,
      lift.platformHeightPx,
    ).setVisible(false);
    this.physics.add.existing(this.liftPlatform, true);
  }

  _createPlayer() {
    const playerConfig = CONFIG.player;
    this.anims.create({
      key: playerConfig.idleAnimationKey,
      frames: this.anims.generateFrameNumbers(CONFIG.assets.player.key, {
        start: 0,
        end: CONFIG.assets.player.endFrame,
      }),
      frameRate: playerConfig.idleFrameRate,
      repeat: -1,
    });
    this.player = this.physics.add.sprite(
      CONFIG.shaft.centerXPx,
      this.liftPlatformY - playerConfig.displaySizePx / 2,
      CONFIG.assets.player.key,
    )
      .setDisplaySize(
        playerConfig.displaySizePx,
        playerConfig.displaySizePx,
      )
      .setDepth(CONFIG.depth.player)
      .setCollideWorldBounds(true)
      .play(playerConfig.idleAnimationKey);
    this.player.body
      .setSize(playerConfig.bodyWidthPx, playerConfig.bodyHeightPx, true)
      .setGravityY(playerConfig.gravityYPxPerSec2)
      .setMaxVelocity(
        playerConfig.walkSpeedPxPerSec,
        playerConfig.maxFallSpeedPxPerSec,
      );
    this.physics.add.collider(this.player, this.liftPlatform);
    for (const landing of this.landingBodies) {
      this.physics.add.collider(this.player, landing);
    }
  }

  _createInput() {
    this.keys = this.input.keyboard.addKeys({
      left: CONFIG.input.left,
      right: CONFIG.input.right,
      interact: CONFIG.input.interact,
      reset: CONFIG.input.reset,
    });
  }

  _configureCamera() {
    const camera = this.cameras.main;
    camera.setBounds(
      0,
      0,
      CONFIG.world.widthPx,
      CONFIG.world.heightPx,
    );
    camera.startFollow(
      this.player,
      true,
      CONFIG.camera.lerpX,
      CONFIG.camera.lerpY,
    );
    camera.setDeadzone(
      CONFIG.camera.deadzoneWidthPx,
      CONFIG.camera.deadzoneHeightPx,
    );
  }

  _updatePlayerMovement() {
    const direction = Number(this.keys.right.isDown)
      - Number(this.keys.left.isDown);
    this.player.setVelocityX(direction * CONFIG.player.walkSpeedPxPerSec);
    if (direction !== 0) this.player.setFlipX(direction < 0);
  }

  _tryStartRide(timeMs) {
    if (this.phase !== "idle" || !this._isPlayerOnLift()) return false;
    const atLower = Math.abs(
      this.liftPlatformY - CONFIG.stops.lower.platformYPx,
    ) <= CONFIG.stops.arrivalTolerancePx;
    this.targetStop = atLower ? CONFIG.stops.upper : CONFIG.stops.lower;
    this.phase = "activating";
    this.phaseStartedAtMs = timeMs;
    this.liftSpeed = 0;
    return true;
  }

  _updateLift(timeMs, deltaSeconds) {
    if (this.phase === "activating") {
      if (timeMs - this.phaseStartedAtMs >= CONFIG.lift.activationDurationMs) {
        this.phase = "moving";
        this.phaseStartedAtMs = timeMs;
      }
      return;
    }
    if (this.phase === "resolved") {
      if (timeMs - this.phaseStartedAtMs >= CONFIG.lift.resolvedDurationMs) {
        this.phase = "idle";
        this.targetStop = null;
      }
      return;
    }
    if (this.phase !== "moving" || !this.targetStop) return;

    const targetY = this.targetStop.platformYPx;
    const distance = Math.abs(targetY - this.liftPlatformY);
    const direction = Math.sign(targetY - this.liftPlatformY);
    const stoppingDistance = (
      this.liftSpeed * this.liftSpeed
    ) / (2 * CONFIG.lift.decelerationPxPerSec2);
    const acceleration = distance <= stoppingDistance
      ? -CONFIG.lift.decelerationPxPerSec2
      : CONFIG.lift.accelerationPxPerSec2;
    this.liftSpeed = Phaser.Math.Clamp(
      this.liftSpeed + acceleration * deltaSeconds,
      0,
      CONFIG.lift.maxSpeedPxPerSec,
    );
    const travel = Math.min(
      distance,
      Math.max(this.liftSpeed * deltaSeconds, CONFIG.stops.arrivalTolerancePx),
    );
    this._moveLiftTo(this.liftPlatformY + direction * travel);
    if (distance <= travel) {
      this._moveLiftTo(targetY);
      this.liftSpeed = 0;
      this.phase = "resolved";
      this.phaseStartedAtMs = timeMs;
    }
  }

  _moveLiftTo(platformY) {
    const wasRiding = this._isPlayerOnLift();
    const deltaY = platformY - this.liftPlatformY;
    this.liftPlatformY = platformY;
    this.liftPlatform.setPosition(
      CONFIG.shaft.centerXPx,
      platformY + CONFIG.lift.platformHeightPx / 2,
    );
    this.liftPlatform.body.updateFromGameObject();
    this.view?.setLiftPosition(platformY);
    if (wasRiding) {
      this.player.setY(this.player.y + deltaY);
      this.player.body.updateFromGameObject();
    }
  }

  _isPlayerOnLift() {
    const body = this.player?.body;
    if (!body) return false;
    const halfWidth = CONFIG.lift.platformWidthPx / 2
      - CONFIG.player.carryInsetPx;
    return Math.abs(this.player.x - CONFIG.shaft.centerXPx) <= halfWidth
      && Math.abs(body.bottom - this.liftPlatformY)
        <= CONFIG.player.carryTolerancePx;
  }

  _resetPrototype() {
    this.phase = "idle";
    this.targetStop = null;
    this.liftSpeed = 0;
    this._moveLiftTo(CONFIG.stops.lower.platformYPx);
    this.player.setPosition(
      CONFIG.shaft.centerXPx + CONFIG.player.spawnOffsetXPx,
      CONFIG.stops.lower.platformYPx - CONFIG.player.displaySizePx / 2,
    );
    this.player.setVelocity(0, 0);
    this.player.body.updateFromGameObject();
  }
}
