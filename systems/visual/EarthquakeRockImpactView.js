import { EARTHQUAKE_FEEDBACK_CONFIG } from "../../values/earthquakeFeedback.js";

export class EarthquakeRockImpactView {
  constructor(scene, config = EARTHQUAKE_FEEDBACK_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.pool = [];
    for (
      let index = 0;
      index < this.config.hazards.maxImpactFx;
      index += 1
    ) {
      this.pool.push(this._createEntry());
    }
  }

  _createEntry() {
    const cfg = this.config.hazards;
    return {
      active: false,
      startedAt: 0,
      token: 0,
      timer: null,
      settledRock: this.scene.add.image(
        0,
        0,
        this.config.assets.fallingBoulder.key,
      ).setOrigin(0.5, cfg.boulderOriginY)
        .setDepth(cfg.settledBoulderDepth)
        .setVisible(false),
      image: this.scene.add.image(
        0,
        0,
        this.config.assets.impactDebris.key,
      ).setOrigin(0.5, cfg.impactOriginY)
        .setDepth(cfg.impactDebrisDepth)
        .setVisible(false),
    };
  }

  play(rock) {
    if (!rock) return false;
    const entry = this._acquire();
    if (!entry) return false;
    const cfg = this.config.hazards;
    const ts = this.scene.config.tileSize;
    const image = entry.image;
    const settledRock = entry.settledRock;
    const token = ++entry.token;
    this._stop(entry);
    entry.active = true;
    entry.startedAt = this.scene.time?.now || performance.now();

    settledRock
      .setPosition(rock.x, rock.endY)
      .setDisplaySize(
        ts * cfg.boulderWidthTiles * cfg.impactRockScale,
        ts * cfg.boulderHeightTiles * cfg.impactRockScale,
      )
      .setRotation(rock.angle || 0)
      .setAlpha(cfg.boulderMinAlpha)
      .setVisible(true);
    image
      .setPosition(rock.x, rock.endY)
      .setDisplaySize(ts * cfg.impactWidthTiles, ts * cfg.impactHeightTiles)
      .setAlpha(0)
      .setVisible(true);

    const baseScaleX = image.scaleX;
    const baseScaleY = image.scaleY;
    const rockScaleX = settledRock.scaleX;
    const rockScaleY = settledRock.scaleY;
    image.setScale(
      baseScaleX * cfg.impactStartScale,
      baseScaleY * cfg.impactStartScale,
    );

    if (!this.scene.tweens?.add) {
      image.setAlpha(1);
      entry.timer = this.scene.time?.delayedCall?.(
        cfg.impactEnterMs + cfg.impactHoldMs + cfg.impactExitMs,
        () => this._release(entry, token),
      );
      return true;
    }

    this.scene.tweens.add({
      targets: settledRock,
      y: rock.endY + ts * cfg.impactRockEmbedTiles,
      scaleX: rockScaleX * cfg.impactRockSquashX,
      scaleY: rockScaleY * cfg.impactRockSquashY,
      rotation: (rock.angle || 0) + cfg.impactRockSettleRotation,
      duration: cfg.impactRockSquashMs,
      ease: "Quad.easeOut",
      onComplete: () => {
        if (!entry.active || token !== entry.token) return;
        this.scene.tweens.add({
          targets: settledRock,
          alpha: 0,
          scaleX: rockScaleX * 0.94,
          scaleY: rockScaleY * 0.9,
          duration: cfg.impactHoldMs + cfg.impactExitMs,
          ease: "Sine.easeOut",
        });
      },
    });
    this.scene.tweens.add({
      targets: image,
      alpha: 1,
      scaleX: baseScaleX * cfg.impactPeakScale,
      scaleY: baseScaleY * cfg.impactPeakScale,
      duration: cfg.impactEnterMs,
      ease: "Back.easeOut",
      onComplete: () => {
        if (!entry.active || token !== entry.token) return;
        entry.timer = this.scene.time?.delayedCall?.(cfg.impactHoldMs, () => {
          if (!entry.active || token !== entry.token) return;
          this.scene.tweens.add({
            targets: image,
            alpha: 0,
            y: rock.endY + ts * cfg.impactDriftTiles,
            duration: cfg.impactExitMs,
            ease: "Sine.easeOut",
            onComplete: () => this._release(entry, token),
          });
        });
      },
    });
    return true;
  }

  _acquire() {
    return this.pool.find(entry => !entry.active)
      || this.pool.reduce((oldest, entry) => (
        entry.startedAt < oldest.startedAt ? entry : oldest
      ), this.pool[0]);
  }

  _stop(entry) {
    entry.timer?.remove?.(false);
    entry.timer = null;
    this.scene.tweens?.killTweensOf?.(entry.image);
    this.scene.tweens?.killTweensOf?.(entry.settledRock);
  }

  _release(entry, token = entry.token) {
    if (token !== entry.token) return;
    this._stop(entry);
    entry.active = false;
    entry.image.setVisible(false).setAlpha(0);
    entry.settledRock.setVisible(false).setAlpha(0);
  }

  clear() {
    this.pool.forEach(entry => this._release(entry));
  }

  destroy() {
    this.clear();
    this.pool.forEach(entry => {
      entry.image.destroy();
      entry.settledRock.destroy();
    });
    this.pool.length = 0;
    this.scene = null;
  }
}
