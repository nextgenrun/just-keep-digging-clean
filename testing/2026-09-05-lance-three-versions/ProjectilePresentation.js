import { CELESTIAL_PRESENTATION as FX } from "../../values/celestialPresentation.js";
import { STELLAR_LANCE_PRESENTATION as P } from "../../values/stellarLancePresentation.js";
import { LANCE_VISUAL_REVIEW as C } from "../../values/stellarLanceVisualReview.js";

/** A fixed fireball whose rear releases from the upper hand/foot contact. */
export class ProjectilePresentation {
  constructor(scene, variant, floorY, tileSize) {
    Object.assign(this, { scene, variant, floorY, tileSize });
    this.body = scene.add.image(0, 0, C.assets[variant.asset].key, variant.frame)
      .setOrigin(variant.originX, variant.originY).setDisplaySize(variant.width, variant.height)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(6);
    const interval = FX.lance.trailSpacingPx / C.speedPxPerSecond * 1000;
    this.echoes = Array.from({ length: Math.min(FX.lance.trailMaxLive,
      Math.ceil(FX.lance.trailLifeMs / interval) + 1) }, () =>
      scene.add.image(0, 0, C.assets[variant.asset].key, variant.frame)
        .setOrigin(variant.originX, variant.originY).setDisplaySize(variant.width, variant.height)
        .setBlendMode(Phaser.BlendModes.ADD).setDepth(5).setVisible(false));
    this.contact = scene.add.graphics().setDepth(7);
    this.footprint = scene.add.graphics().setDepth(8);
    this.targets = C.hitDistances.map(distance => ({
      distance, image: scene.add.image(0, floorY - tileSize / 2, C.assets.stone.key)
        .setDisplaySize(tileSize, tileSize).setTint(0x879198).setDepth(2),
    }));
  }
  projectX(x, direction) { return direction > 0 ? x : C.mirrorX - x; }

  renderEchoes(age, direction, origin, travelMs) {
    const cfg = FX.lance;
    const interval = cfg.trailSpacingPx / C.speedPxPerSecond * 1000;
    const last = Math.floor(Math.max(0, Math.min(age, travelMs)) / interval);
    this.echoes.forEach((echo, index) => {
      const sample = last - index, echoAge = age - sample * interval;
      echo.setPosition(origin.x + direction * (sample - 1) * cfg.trailSpacingPx, origin.y)
        .setRotation(direction > 0 ? 0 : Math.PI)
        .setAlpha(cfg.trailAlpha * Math.max(0, 1 - echoAge / cfg.trailLifeMs))
        .setVisible(sample > 0 && echoAge >= 0 && echoAge < cfg.trailLifeMs);
    });
  }

  render(timeMs, direction, showFootprint, origin, launchAtMs) {
    const age = timeMs - launchAtMs;
    const noseOffset = P.displayWidthPx * (1 - P.originX);
    const travelDistance = C.rangeTiles * this.tileSize - noseOffset;
    const travelMs = travelDistance / C.speedPxPerSecond * 1000;
    const flying = age >= 0 && age < travelMs;
    const distance = Math.max(0, Math.min(travelMs, age)) * C.speedPxPerSecond / 1000;
    this.body.setPosition(origin.x + direction * distance, origin.y)
      .setRotation(direction > 0 ? 0 : Math.PI).setVisible(flying)
      .setAlpha(P.alpha);
    this.renderEchoes(age, direction, origin, travelMs);
    this.contact.clear(); this.footprint.clear();
    if (flying && showFootprint) {
      this.footprint.lineStyle(1, 0xd4b680, 0.55);
      this.footprint.strokeRect(direction > 0 ? this.body.x - C.originalWidth : this.body.x,
        origin.y - C.originalHeight / 2, C.originalWidth, C.originalHeight);
    }
    let contactsVisible = 0, contactsDue = 0;
    this.targets.forEach((target, index) => {
      const x = origin.x + direction * target.distance * this.tileSize;
      const targetAge = age - Math.max(0, target.distance * this.tileSize - noseOffset)
        / C.speedPxPerSecond * 1000;
      const terminal = index === this.targets.length - 1;
      target.image.setX(x + direction * this.tileSize / 2).setVisible(terminal || targetAge < 0);
      if (targetAge >= 0) contactsDue += 1;
      if (targetAge >= 0 && targetAge < C.impactMs) {
        contactsVisible += 1;
        const alpha = 1 - targetAge / C.impactMs;
        this.contact.lineStyle(2, this.variant.color, alpha);
        this.contact.lineBetween(x, origin.y - 11, x, origin.y + 11);
        this.contact.lineStyle(1, 0xffffff, alpha);
        this.contact.lineBetween(x - 6, origin.y - 7, x + 6, origin.y + 7);
      }
    });
    this.snapshot = {
      variant: this.variant.id, timeMs, flying, x: this.body.x, y: this.body.y,
      width: this.body.displayWidth, height: this.body.displayHeight,
      bounds: this.body.getBounds(), originX: this.body.originX,
      alpha: this.body.alpha, angle: this.body.angle, origin, launchAtMs,
      contactsVisible, contactsDue,
      echoes: this.echoes.filter(echo => echo.visible).map(echo => ({ x: echo.x, y: echo.y,
        alpha: echo.alpha, width: echo.displayWidth, height: echo.displayHeight, angle: echo.angle })),
    };
  }
}
