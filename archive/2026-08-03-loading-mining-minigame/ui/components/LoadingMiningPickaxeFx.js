export class LoadingMiningPickaxeFx {
  constructor(scene, config, {
    pickaxe,
    pickaxeGhost,
    onContact,
    onPhase,
  }) {
    this.scene = scene;
    this.config = config;
    this.pickaxe = pickaxe;
    this.pickaxeGhost = pickaxeGhost;
    this.onContact = onContact;
    this.onPhase = onPhase;
    this.swingCount = 0;
    this.contactTimers = new Set();
    this.swingTween = null;
    this.restTimer = null;
    this.destroyed = false;
  }

  _setPhase(phase) {
    this.onPhase?.(phase);
  }

  _returnToRest({
    homeX,
    homeY,
    scaleX,
    scaleY,
    board,
    timing,
  }) {
    if (this.destroyed || !this.pickaxe?.scene) return;
    this.swingTween?.stop();
    this.swingTween = null;
    this.pickaxe
      .setPosition(homeX, homeY)
      .setAngle(timing.pickaxeRestAngleDeg)
      .setScale(scaleX, scaleY)
      .setVisible(board.pickaxeRestVisible === true);
    this.pickaxeGhost.setVisible(false);
    this._setPhase("idle");
  }

  swing(view, kind = "hit") {
    if (this.destroyed || !view?.root?.scene) return;
    const timing = this.config.timing;
    const board = this.config.layout.board;
    const homeX = view.root.x + board.pickaxeOffsetX;
    const homeY = view.baseY + board.pickaxeOffsetY;
    this.restTimer?.remove();
    this.restTimer = null;
    this.swingTween?.stop();
    this.scene.tweens.killTweensOf(this.pickaxe);
    this.scene.tweens.killTweensOf(this.pickaxeGhost);

    this.pickaxe
      .setVisible(true)
      .setDisplaySize(board.pickaxeSize, board.pickaxeSize)
      .setPosition(homeX, homeY)
      .setAngle(timing.pickaxeRestAngleDeg);
    const scaleX = this.pickaxe.scaleX;
    const scaleY = this.pickaxe.scaleY;
    this.pickaxeGhost
      .setTexture(this.pickaxe.texture.key)
      .setDisplaySize(board.pickaxeSize, board.pickaxeSize)
      .setPosition(homeX + 2, homeY + 1)
      .setAngle(timing.pickaxeWindupAngleDeg)
      .setAlpha(timing.pickaxeGhostAlpha)
      .setVisible(true);
    const ghostScaleX = this.pickaxeGhost.scaleX;
    const ghostScaleY = this.pickaxeGhost.scaleY;
    this.scene.tweens.add({
      targets: this.pickaxeGhost,
      x: homeX - 7,
      y: homeY - 5,
      angle: timing.pickaxeStrikeAngleDeg + 7,
      alpha: 0,
      scaleX: ghostScaleX * 1.05,
      scaleY: ghostScaleY * 1.05,
      duration: timing.pickaxeWindupMs + timing.pickaxeStrikeMs,
      ease: "Quad.easeIn",
      onComplete: () => this.pickaxeGhost.setVisible(false),
    });

    const rest = () => this._returnToRest({
      homeX,
      homeY,
      scaleX,
      scaleY,
      board,
      timing,
    });
    this.swingTween = this.scene.tweens.chain({
      targets: this.pickaxe,
      tweens: [
        {
          x: homeX + 2,
          y: homeY + 1,
          angle: timing.pickaxeWindupAngleDeg,
          scaleX: scaleX * 1.025,
          scaleY: scaleY * 1.025,
          duration: timing.pickaxeWindupMs,
          ease: "Sine.easeOut",
        },
        {
          x: homeX - 6,
          y: homeY - 5,
          angle: timing.pickaxeStrikeAngleDeg,
          scaleX: scaleX * 0.96,
          scaleY: scaleY * 0.96,
          duration: timing.pickaxeStrikeMs,
          ease: "Quad.easeIn",
        },
        {
          x: homeX + 1,
          y: homeY + 1,
          angle: timing.pickaxeRecoilAngleDeg,
          scaleX: scaleX * 1.015,
          scaleY: scaleY * 1.015,
          duration: timing.pickaxeRecoilMs,
          ease: "Back.easeOut",
        },
        {
          x: homeX,
          y: homeY,
          angle: timing.pickaxeRestAngleDeg,
          scaleX,
          scaleY,
          duration: timing.pickaxeSettleMs,
          ease: "Sine.easeOut",
        },
      ],
      onComplete: rest,
    });

    let contactTimer = null;
    contactTimer = this.scene.time.delayedCall(
      timing.pickaxeContactDelayMs,
      () => {
        this.contactTimers.delete(contactTimer);
        this.onContact?.(view, kind);
      },
    );
    this.contactTimers.add(contactTimer);
    const restDelay = timing.pickaxeWindupMs
      + timing.pickaxeStrikeMs
      + timing.pickaxeRecoilMs
      + timing.pickaxeSettleMs;
    this.restTimer = this.scene.time.delayedCall(restDelay, () => {
      this.restTimer = null;
      rest();
    });
    this.swingCount += 1;
    this._setPhase("windup");
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.swingTween?.stop();
    this.restTimer?.remove();
    this.contactTimers.forEach(timer => timer.remove());
    this.contactTimers.clear();
  }
}
