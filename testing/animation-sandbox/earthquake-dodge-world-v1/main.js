import {
  EARTHQUAKE_DODGE_REVIEW,
  getEarthquakeDodgeReviewAssets,
} from "../../../values/earthquakeDodgeReview.js";
import {
  applyStaticShot,
  createHud,
  createWorldLayers,
  rockY,
  setStatus,
} from "./earthquakeDodgeReviewView.js";

const CONFIG = EARTHQUAKE_DODGE_REVIEW;
const ROOT_PREFIX = "../../../";

function assetUrl(path) {
  return `${ROOT_PREFIX}${path}`;
}

class EarthquakeDodgeWorldReview extends Phaser.Scene {
  constructor() {
    super(CONFIG.sceneKey);
    this.shot = CONFIG.defaultShot;
    this.sequenceMs = 0;
    this.impactResolved = false;
    this.result = "pending";
  }

  preload() {
    for (const asset of getEarthquakeDodgeReviewAssets()) {
      if (asset === CONFIG.assets.playerIdle) {
        this.load.spritesheet(asset.key, assetUrl(asset.path), {
          frameWidth: CONFIG.player.frameWidth,
          frameHeight: CONFIG.player.frameHeight,
        });
      } else {
        this.load.image(asset.key, assetUrl(asset.path));
      }
    }
  }

  create() {
    const query = new URLSearchParams(window.location.search);
    const requestedShot = query.get(CONFIG.queryKey);
    this.shot = requestedShot || CONFIG.defaultShot;
    createWorldLayers(this, CONFIG);
    createHud(this, CONFIG);
    this._createInput();
    this._createIdleAnimation();

    if (this.shot === CONFIG.interactiveShot) {
      this._resetInteractiveSequence();
    } else {
      applyStaticShot(this, CONFIG, CONFIG.shots[this.shot] || CONFIG.shots.warning);
    }
  }

  _createInput() {
    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      flight: Phaser.Input.Keyboard.KeyCodes.SHIFT,
      reset: Phaser.Input.Keyboard.KeyCodes.R,
      warning: Phaser.Input.Keyboard.KeyCodes.ONE,
      dodge: Phaser.Input.Keyboard.KeyCodes.TWO,
      impact: Phaser.Input.Keyboard.KeyCodes.THREE,
      hit: Phaser.Input.Keyboard.KeyCodes.FOUR,
    });
  }

  _createIdleAnimation() {
    const { assets, player } = CONFIG;
    const key = `${assets.playerIdle.key}-anim`;
    this.anims.create({
      key,
      frames: this.anims.generateFrameNumbers(assets.playerIdle.key, {
        start: 0,
        end: player.frameCount - 1,
      }),
      frameRate: player.frameRate,
      repeat: -1,
    });
    this.player.play(key);
  }

  _resetInteractiveSequence() {
    const { world } = CONFIG;
    this.sequenceMs = 0;
    this.impactResolved = false;
    this.result = "pending";
    this.player.setPosition(world.playerStartX, world.floorY);
    this.rock.setVisible(false);
    this.impact.setVisible(false);
    this.footprint.setVisible(true);
    this.ceilingFracture.setVisible(true);
    setStatus(this, "CAVE-IN", "MOVE OUT OF THE LIT FOOTPRINT");
  }

  _updatePlayer(delta) {
    const { player, world } = CONFIG;
    const seconds = delta / 1000;
    const horizontal =
      (this.keys.right.isDown ? 1 : 0) - (this.keys.left.isDown ? 1 : 0);
    this.player.x = Phaser.Math.Clamp(
      this.player.x + horizontal * player.moveSpeed * seconds,
      player.displaySize / 2,
      CONFIG.viewport.width - player.displaySize / 2,
    );
    if (this.keys.flight.isDown) {
      const vertical =
        (this.keys.down.isDown ? 1 : 0) - (this.keys.up.isDown ? 1 : 0);
      this.player.y = Phaser.Math.Clamp(
        this.player.y + vertical * player.flightSpeed * seconds,
        world.flightY,
        world.floorY,
      );
    } else {
      this.player.y = world.floorY;
    }
  }

  _playerIsClear() {
    const { world, player, hazard } = CONFIG;
    const rockWidth = hazard.rockWidthTiles * world.tileSize;
    const horizontalClearance =
      player.bodyWidth / 2 + rockWidth / 2 + player.safeMargin;
    const horizontallyClear =
      Math.abs(this.player.x - world.targetX) > horizontalClearance;
    const verticallyClear =
      this.player.y + player.bodyHeight / 2 <
      world.floorY - hazard.fallingBoulderHeight / 2;
    return horizontallyClear || verticallyClear;
  }

  _resolveImpact() {
    if (this.impactResolved) return;
    const { hazard } = CONFIG;
    this.impactResolved = true;
    this.result = this._playerIsClear() ? "clear" : "hit";
    this.rock.setVisible(false);
    const targetScaleX = hazard.impactDebrisWidth / this.impact.width;
    const targetScaleY = hazard.impactDebrisHeight / this.impact.height;
    this.impact
      .setVisible(true)
      .setAlpha(1)
      .setScale(targetScaleX * 0.72, targetScaleY * 0.72);
    this.tweens.add({
      targets: this.impact,
      scaleX: targetScaleX,
      scaleY: targetScaleY,
      duration: hazard.impactMs * 0.22,
      ease: "Back.Out",
    });
    this.cameras.main.shake(hazard.impactMs * 0.2, 0.004);
    if (this.result === "clear") {
      setStatus(this, "CLEAR", "IMPACT MISSED — ROUTE MAY CHANGE");
    } else {
      setStatus(this, "DIRECT HIT", "CURRENT BUILD DRAINS ALL GEM POWER");
    }
  }

  _updateInteractive(delta) {
    const { hazard } = CONFIG;
    this._updatePlayer(delta);
    this.sequenceMs += delta;
    if (this.sequenceMs < hazard.warningMs) {
      const ratio = this.sequenceMs / hazard.warningMs;
      this.rock.setVisible(false);
      this.impact.setVisible(false);
      this.footprint.setAlpha(
        Phaser.Math.Linear(
          hazard.footprintMinAlpha,
          hazard.footprintMaxAlpha,
          ratio,
        ),
      );
      return;
    }

    const fallEnd = hazard.warningMs + hazard.fallMs;
    if (this.sequenceMs < fallEnd) {
      const fallRatio = (this.sequenceMs - hazard.warningMs) / hazard.fallMs;
      this.rock
        .setVisible(true)
        .setY(rockY(CONFIG, fallRatio))
        .setRotation(hazard.rockRotation * fallRatio);
      setStatus(this, "ROCK FALLING", "DODGE LATERALLY OR USE FLIGHT");
      return;
    }

    this._resolveImpact();
    const cycleEnd = fallEnd + hazard.impactMs + hazard.resetMs;
    if (this.sequenceMs >= cycleEnd) this._resetInteractiveSequence();
  }

  _switchStaticShot(name) {
    this.shot = name;
    applyStaticShot(this, CONFIG, CONFIG.shots[name]);
  }

  update(_time, delta) {
    if (Phaser.Input.Keyboard.JustDown(this.keys.reset)) {
      this.shot === CONFIG.interactiveShot
        ? this._resetInteractiveSequence()
        : this._switchStaticShot(CONFIG.defaultShot);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.warning)) {
      this._switchStaticShot("warning");
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.dodge)) {
      this._switchStaticShot("dodge");
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.impact)) {
      this._switchStaticShot("impact");
    } else if (Phaser.Input.Keyboard.JustDown(this.keys.hit)) {
      this._switchStaticShot("hit");
    }
    if (this.shot === CONFIG.interactiveShot) this._updateInteractive(delta);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: document.body,
  width: CONFIG.viewport.width,
  height: CONFIG.viewport.height,
  backgroundColor: CONFIG.viewport.backgroundColor,
  scene: [EarthquakeDodgeWorldReview],
  render: {
    antialias: true,
    pixelArt: false,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});
