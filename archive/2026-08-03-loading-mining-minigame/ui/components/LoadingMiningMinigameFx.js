import { LoadingMiningPickaxeFx } from "./LoadingMiningPickaxeFx.js";

export class LoadingMiningMinigameFx {
  constructor(scene, config, {
    cells,
    hitChipPool,
    debrisPool,
    breakBurstPool,
    pickaxe,
    pickaxeGhost,
    applyCell,
    onFxUpdate,
  }) {
    this.scene = scene;
    this.config = config;
    this.cells = cells;
    this.hitChipPool = hitChipPool;
    this.debrisPool = debrisPool;
    this.breakBurstPool = breakBurstPool;
    this.applyCell = applyCell;
    this.onFxUpdate = onFxUpdate;
    this.hitChipIndex = 0;
    this.debrisIndex = 0;
    this.breakBurstIndex = 0;
    this.contactCount = 0;
    this.hitFxCount = 0;
    this.breakFxCount = 0;
    this.dropCellCount = 0;
    this.lastPhase = "idle";
    this.destroyed = false;
    this.pickaxeFx = new LoadingMiningPickaxeFx(scene, config, {
      pickaxe,
      pickaxeGhost,
      onContact: (view, kind) => this._showContact(view, kind),
      onPhase: (phase) => {
        this.lastPhase = phase;
        this.onFxUpdate?.();
      },
    });
  }

  animateHit(view) {
    const { timing, layout } = this.config;
    const board = layout.board;
    const direction = this.pickaxeFx.swingCount % 2 === 0 ? -1 : 1;
    this.scene.tweens.killTweensOf(view.block);
    this.scene.tweens.killTweensOf(view.fracture);
    view.block
      .setPosition(0, 0)
      .setAngle(0)
      .setDisplaySize(board.cellSize, board.cellSize);
    const blockScaleX = view.block.scaleX;
    const blockScaleY = view.block.scaleY;
    this.scene.tweens.chain({
      targets: view.block,
      tweens: [
        {
          x: direction * 2,
          y: 3,
          angle: direction * 2.5,
          scaleX: blockScaleX * 1.045,
          scaleY: blockScaleY * 0.9,
          duration: timing.hitCompressMs,
          ease: "Quad.easeIn",
        },
        {
          x: direction * -1,
          y: -1,
          angle: direction * -1.25,
          scaleX: blockScaleX * 0.975,
          scaleY: blockScaleY * 1.035,
          duration: timing.hitReboundMs,
          ease: "Back.easeOut",
        },
        {
          x: 0,
          y: 0,
          angle: 0,
          scaleX: blockScaleX,
          scaleY: blockScaleY,
          duration: timing.hitSettleMs,
          ease: "Sine.easeOut",
        },
      ],
      onComplete: () => {
        if (!view.block?.scene) return;
        view.block
          .setPosition(0, 0)
          .setAngle(0)
          .setScale(blockScaleX, blockScaleY);
      },
    });

    const fractureAlpha = view.fracture.alpha;
    view.fracture
      .setDisplaySize(
        board.cellSize * board.fractureScale,
        board.cellSize * board.fractureScale,
      )
      .setVisible(true);
    const fractureScaleX = view.fracture.scaleX;
    const fractureScaleY = view.fracture.scaleY;
    view.fracture
      .setScale(fractureScaleX * 1.12, fractureScaleY * 1.12)
      .setAlpha(Math.min(1, fractureAlpha + 0.22));
    this.scene.tweens.add({
      targets: view.fracture,
      alpha: fractureAlpha,
      scaleX: fractureScaleX,
      scaleY: fractureScaleY,
      duration: timing.hitReboundMs + timing.hitSettleMs,
      ease: "Cubic.easeOut",
    });
    this.lastPhase = "hit-react";
  }

  dropColumn(column, rows) {
    const { board } = this.config.layout;
    const timing = this.config.timing;
    const pitch = board.cellSize + board.cellGap;
    rows.forEach((row, index) => {
      const view = this.cells[row][column];
      this.scene.tweens.killTweensOf(view.root);
      this.scene.tweens.killTweensOf(view.block);
      this.scene.tweens.killTweensOf(view.fracture);
      view.root
        .setScale(1)
        .setAlpha(0.76);
      view.block
        .setPosition(0, 0)
        .setAngle(0)
        .setDisplaySize(board.cellSize, board.cellSize);
      view.fracture.setDisplaySize(
        board.cellSize * board.fractureScale,
        board.cellSize * board.fractureScale,
      );
      this.applyCell(view);
      view.root.y = view.baseY - pitch;
      this.scene.tweens.chain({
        targets: view.root,
        delay: index * board.dropStaggerMs,
        tweens: [
          {
            y: view.baseY,
            alpha: 1,
            duration: timing.dropMs,
            ease: "Cubic.easeIn",
          },
          {
            scaleX: 1.045,
            scaleY: 0.91,
            duration: timing.dropSquashMs,
            ease: "Quad.easeOut",
          },
          {
            scaleX: 1,
            scaleY: 1,
            duration: timing.dropSettleMs,
            ease: "Back.easeOut",
          },
        ],
        onComplete: () => {
          if (!view.root?.scene) return;
          view.root
            .setPosition(view.root.x, view.baseY)
            .setScale(1)
            .setAlpha(1);
        },
      });
    });
    this.dropCellCount += rows.length;
    this.lastPhase = "column-drop";
  }

  showHitChips(view, isBreak = false) {
    const chip = this.hitChipPool[
      this.hitChipIndex++ % this.hitChipPool.length
    ];
    if (!chip) return;
    const { board } = this.config.layout;
    const timing = this.config.timing;
    const direction = this.hitChipIndex % 2 === 0 ? -1 : 1;
    this.scene.tweens.killTweensOf(chip);
    chip
      .setDisplaySize(board.hitChipSize, board.hitChipSize)
      .setPosition(view.root.x + direction * 2, view.baseY + 4)
      .setVisible(true)
      .setAlpha(timing.hitChipStartAlpha)
      .setAngle(direction * (isBreak ? 8 : 4));
    const scaleX = chip.scaleX;
    const scaleY = chip.scaleY;
    chip.setScale(
      scaleX * timing.hitChipStartScale,
      scaleY * timing.hitChipStartScale,
    );
    this.scene.tweens.add({
      targets: chip,
      x: chip.x + direction * (isBreak ? 10 : 6),
      y: chip.y - (isBreak ? 12 : 7),
      alpha: timing.hitChipEndAlpha,
      scaleX: scaleX * timing.hitChipEndScale,
      scaleY: scaleY * timing.hitChipEndScale,
      angle: direction * (isBreak ? 15 : 9),
      duration: timing.hitChipMs,
      ease: "Cubic.easeOut",
      onComplete: () => chip.setVisible(false),
    });
    this.hitFxCount += 1;
  }

  showDebris(view) {
    const debris = this.debrisPool[this.debrisIndex++ % this.debrisPool.length];
    if (!debris) return;
    const timing = this.config.timing;
    const board = this.config.layout.board;
    const direction = this.debrisIndex % 2 === 0 ? -1 : 1;
    this.scene.tweens.killTweensOf(debris);
    debris
      .setDisplaySize(board.debrisSize, board.debrisSize)
      .setPosition(view.root.x + direction * 2, view.baseY + 7)
      .setVisible(true)
      .setAlpha(timing.debrisStartAlpha)
      .setAngle(direction * Math.abs(timing.debrisStartAngleDeg));
    const scaleX = debris.scaleX;
    const scaleY = debris.scaleY;
    debris.setScale(
      scaleX * timing.debrisStartScale,
      scaleY * timing.debrisStartScale,
    );
    this.scene.tweens.add({
      targets: debris,
      x: debris.x + direction * 8,
      y: debris.y - 15,
      alpha: timing.debrisEndAlpha,
      scaleX: scaleX * timing.debrisEndScale,
      scaleY: scaleY * timing.debrisEndScale,
      angle: direction * timing.debrisEndAngleDeg,
      duration: timing.debrisMs,
      ease: "Cubic.easeOut",
      onComplete: () => debris.setVisible(false),
    });
  }

  showBreakBurst(view) {
    const burst = this.breakBurstPool[
      this.breakBurstIndex++ % this.breakBurstPool.length
    ];
    if (!burst) return;
    const timing = this.config.timing;
    const board = this.config.layout.board;
    const direction = this.breakBurstIndex % 2 === 0 ? -1 : 1;
    this.scene.tweens.killTweensOf(burst);
    burst
      .setDisplaySize(board.breakBurstSize, board.breakBurstSize)
      .setPosition(view.root.x, view.baseY - 1)
      .setVisible(true)
      .setAlpha(timing.breakBurstStartAlpha)
      .setAngle(direction * 4);
    const scaleX = burst.scaleX;
    const scaleY = burst.scaleY;
    burst.setScale(
      scaleX * timing.breakBurstStartScale,
      scaleY * timing.breakBurstStartScale,
    );
    this.scene.tweens.add({
      targets: burst,
      y: burst.y - 5,
      alpha: timing.breakBurstEndAlpha,
      scaleX: scaleX * timing.breakBurstEndScale,
      scaleY: scaleY * timing.breakBurstEndScale,
      angle: direction * 9,
      duration: timing.breakBurstMs,
      ease: "Expo.easeOut",
      onComplete: () => burst.setVisible(false),
    });
    this.breakFxCount += 1;
  }

  _showContact(view, kind) {
    if (this.destroyed || !view?.root?.scene) return;
    const isBreak = kind === "break";
    this.contactCount += 1;
    this.lastPhase = isBreak ? "break-contact" : "hit-contact";
    this.showHitChips(view, isBreak);
    if (isBreak) {
      this.showDebris(view);
      this.showBreakBurst(view);
    }
    this.onFxUpdate?.();
  }

  swingPickaxe(view, kind = "hit") {
    this.pickaxeFx.swing(view, kind);
  }

  getSnapshot() {
    return {
      fxSwingCount: this.pickaxeFx.swingCount,
      fxContactCount: this.contactCount,
      fxHitCount: this.hitFxCount,
      fxBreakCount: this.breakFxCount,
      fxDropCellCount: this.dropCellCount,
      fxLastPhase: this.lastPhase,
    };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.pickaxeFx?.destroy();
    this.lastPhase = "destroyed";
  }
}
