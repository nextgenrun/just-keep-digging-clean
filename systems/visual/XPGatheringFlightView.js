import { XP_GATHERING_CONFIG } from "../../values/xpGathering.js";
import { resolveXpFlightPose } from "./XPGatheringFxMath.js";

export class XPGatheringFlightView {
  constructor(scene, { addImage, removeSprite }) {
    this.scene = scene;
    this.addImage = addImage;
    this.removeSprite = removeSprite;
    this.reducedMotion = globalThis.matchMedia?.(
      XP_GATHERING_CONFIG.pickup.reducedMotion.mediaQuery,
    )?.matches === true;
  }

  animate(details) {
    const {
      sprite,
      motionPlan,
      profile,
      index,
      target,
      baseScaleX,
      baseScaleY,
      sourceColor,
      isFinalPickup,
      onFinalArrival,
    } = details;
    const pickup = XP_GATHERING_CONFIG.pickup;
    const flight = pickup.flightProfiles[profile.flight]
      || pickup.flightProfiles.routine;
    const state = { t: 0, trailIndex: 0, echoIndex: 0 };
    const startRotation = sprite.rotation;
    const durationMultiplier = this.reducedMotion
      ? pickup.reducedMotion.durationMultiplier
      : 1;
    sprite._xpTravelState = state;
    this.scene.tweens.add({
      targets: state,
      t: 1,
      duration: motionPlan.durationMs * durationMultiplier,
      ease: motionPlan.ease,
      onUpdate: () => {
        if (!sprite.active) return;
        const pose = resolveXpFlightPose(
          motionPlan,
          state.t,
          flight,
          index,
          this.reducedMotion,
        );
        const fade = Math.max(0, state.t - pickup.travelFadeStartRatio)
          / (1 - pickup.travelFadeStartRatio);
        const endScale = 1 - pickup.travelScaleLossRatio;
        const travelScale = pickup.popEndScale + (endScale - pickup.popEndScale) * state.t;
        sprite.setPosition(pose.x, pose.y)
          .setScale(
            baseScaleX * travelScale * pose.scaleX,
            baseScaleY * travelScale * pose.scaleY,
          )
          .setAlpha(profile.alpha * (1 - fade))
          .setRotation(startRotation + pose.rotation);
        if (!this.reducedMotion) {
          this._emitDueTrails(sprite, sourceColor, flight, state);
          this._emitDueEchoes(sprite, flight, state);
        }
      },
      onComplete: () => {
        if (!sprite.active) return;
        this._spawnArrivalEchoes(target, sprite, flight, profile, isFinalPickup);
        if (isFinalPickup) onFinalArrival?.(target);
        this.removeSprite(sprite);
      },
    });
  }

  _emitDueTrails(sprite, color, flight, state) {
    while (
      state.trailIndex < flight.trailRatios.length
      && state.t >= flight.trailRatios[state.trailIndex]
    ) {
      state.trailIndex += 1;
      this._spawnTrailFleck(sprite, color);
    }
  }

  _emitDueEchoes(sprite, flight, state) {
    while (
      state.echoIndex < flight.echoRatios.length
      && state.t >= flight.echoRatios[state.echoIndex]
    ) {
      state.echoIndex += 1;
      this._spawnTravelEcho(sprite, flight);
    }
  }

  _spawnTrailFleck(sprite, color) {
    const particles = XP_GATHERING_CONFIG.pickup.particles;
    const fleck = this.addImage(sprite.x, sprite.y, sprite.texture.key, false);
    if (!fleck) return;
    fleck.setDisplaySize(particles.trailDisplaySizePx, particles.trailDisplaySizePx)
      .setTintFill(color)
      .setAlpha(particles.trailAlpha)
      .setRotation(sprite.rotation);
    this.scene.tweens.add({
      targets: fleck,
      y: fleck.y + particles.trailFallPx,
      alpha: 0,
      duration: particles.trailDurationMs,
      ease: particles.trailEase,
      onComplete: () => this.removeSprite(fleck),
    });
  }

  _spawnTravelEcho(sprite, flight) {
    const echo = this.addImage(sprite.x, sprite.y, sprite.texture.key, false);
    if (!echo) return;
    const minimumSize = XP_GATHERING_CONFIG.pickup.particles.trailDisplaySizePx;
    const size = Math.max(minimumSize, sprite.displayWidth * flight.echoSizeRatio);
    echo.setDisplaySize(size, size)
      .setAlpha(flight.echoAlpha)
      .setRotation(sprite.rotation);
    const scaleX = echo.scaleX;
    const scaleY = echo.scaleY;
    this.scene.tweens.add({
      targets: echo,
      y: echo.y + flight.echoDriftPx,
      alpha: 0,
      scaleX: scaleX * flight.echoSizeRatio,
      scaleY: scaleY * flight.echoSizeRatio,
      duration: flight.echoDurationMs,
      ease: XP_GATHERING_CONFIG.pickup.particles.trailEase,
      onComplete: () => this.removeSprite(echo),
    });
  }

  _spawnArrivalEchoes(target, sprite, flight, profile, isFinalPickup) {
    const pickup = XP_GATHERING_CONFIG.pickup;
    const count = isFinalPickup ? flight.arrivalEchoCount : 1;
    for (let index = 0; index < count; index += 1) {
      const echo = this.addImage(target.x, target.y, sprite.texture.key, false);
      if (!echo) continue;
      const microScale = isFinalPickup ? 1 : pickup.arrivalMicroScale;
      const microAlpha = isFinalPickup ? 1 : pickup.arrivalMicroAlphaMultiplier;
      echo.setDisplaySize(
        pickup.arrivalSizePx * microScale,
        pickup.arrivalSizePx * microScale,
      ).setAlpha(profile.alpha * pickup.arrivalEchoAlphaMultiplier * microAlpha)
        .setRotation(sprite.rotation);
      const scaleX = echo.scaleX;
      const scaleY = echo.scaleY;
      this.scene.tweens.add({
        targets: echo,
        alpha: 0,
        scaleX: scaleX * flight.arrivalEchoScale,
        scaleY: scaleY * flight.arrivalEchoScale,
        delay: index * flight.arrivalEchoStaggerMs,
        duration: pickup.arrivalEchoDurationMs,
        ease: pickup.arrivalEchoEase,
        onComplete: () => this.removeSprite(echo),
      });
    }
  }
}
