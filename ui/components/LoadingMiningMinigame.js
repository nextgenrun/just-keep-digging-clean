import {
  getLoadingMiningMinigamePreloadAssets,
  LOADING_MINING_MINIGAME_CONFIG,
  resolveLoadingMiningMinigameEnabled,
} from "../../values/loadingMiningMinigame.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { LoadingMiningMinigameState } from "../../systems/mining/LoadingMiningMinigameState.js";
import { LoadingMiningMinigameFx } from "./LoadingMiningMinigameFx.js";

export function hasLoadingMiningMinigameAssets(
  scene,
  config = LOADING_MINING_MINIGAME_CONFIG,
  search = globalThis.location?.search || "",
) {
  return resolveLoadingMiningMinigameEnabled(search, config)
    && getLoadingMiningMinigamePreloadAssets(config, search)
      .every(asset => scene?.textures?.exists?.(asset.key));
}

export class LoadingMiningMinigameView {
  constructor(scene, {
    config = LOADING_MINING_MINIGAME_CONFIG,
    random = Math.random,
  } = {}) {
    this.scene = scene;
    this.config = config;
    this.state = new LoadingMiningMinigameState({ config, random });
    this.cells = [];
    this.hitChipPool = [];
    this.debrisPool = [];
    this.breakBurstPool = [];
    this.pointerHeld = false;
    this.paused = false;
    this.destroyed = false;
    this._build();
    this.fx = new LoadingMiningMinigameFx(scene, config, {
      cells: this.cells,
      hitChipPool: this.hitChipPool,
      debrisPool: this.debrisPool,
      breakBurstPool: this.breakBurstPool,
      pickaxe: this.pickaxe,
      pickaxeGhost: this.pickaxeGhost,
      applyCell: view => this._applyCell(view),
      onFxUpdate: () => this._publishDiagnostics(),
    });
    this._bindInput();
    this._select(this.state.selected.row, this.state.selected.column);
    this._publishDiagnostics();
  }

  _build() {
    const { layout, assets, copy, timing } = this.config;
    const board = layout.board;
    const viewportWidth = this.scene.scale?.width || layout.referenceWidth;
    const viewportHeight = this.scene.scale?.height || layout.referenceHeight;
    const scale = Math.min(
      viewportWidth / layout.referenceWidth,
      viewportHeight / layout.referenceHeight,
    );
    const viewportOffsetX = (
      viewportWidth - layout.referenceWidth * scale
    ) / 2;
    const viewportOffsetY = (
      viewportHeight - layout.referenceHeight * scale
    ) / 2;
    const presentationScale = board.presentationScale ?? 1;
    const rootScale = scale * presentationScale;
    const centerX = board.centerX ?? layout.referenceWidth / 2;
    const centerY = board.centerY;
    this.root = this.scene.add.container(
      viewportOffsetX + centerX * scale,
      viewportOffsetY + centerY * scale - centerY * rootScale,
    ).setScale(rootScale);

    const boardFrame = this.scene.add.image(
      0,
      board.centerY,
      assets.boardFrame.key,
    ).setDisplaySize(board.width, board.height);
    if (board.frameCrop) {
      boardFrame.setCrop(
        board.frameCrop.x,
        board.frameCrop.y,
        board.frameCrop.width,
        board.frameCrop.height,
      );
    }
    this.root.add(boardFrame);
    this.blocksFrame = this._addCounter(-board.counterX, copy.blocksMined);
    this.chainFrame = this._addCounter(board.counterX, copy.bestChain);

    const gridWidth = board.columns * board.cellSize + (board.columns - 1) * board.cellGap;
    const left = -gridWidth / 2 + board.cellSize / 2;
    const pitch = board.cellSize + board.cellGap;
    for (let row = 0; row < board.rows; row += 1) {
      const rowViews = [];
      for (let column = 0; column < board.columns; column += 1) {
        const x = left + column * pitch;
        const y = board.centerY + board.gridTopY + row * pitch + board.cellSize / 2;
        const root = this.scene.add.container(x, y);
        const block = this.scene.add.image(0, 0, assets.materials[0].textureKey)
          .setDisplaySize(board.cellSize, board.cellSize)
          .setInteractive({ useHandCursor: true });
        const fracture = this.scene.add.image(0, 0, assets.hitFracture.key)
          .setDisplaySize(board.cellSize * board.fractureScale, board.cellSize * board.fractureScale)
          .setVisible(false);
        root.add([block, fracture]);
        this.root.add(root);
        const view = { root, block, fracture, baseY: y, row, column };
        block.on("pointerover", () => this._select(row, column));
        block.on("pointerdown", () => this._startHold(row, column));
        rowViews.push(view);
      }
      this.cells.push(rowViews);
    }

    this.target = this.scene.add.image(0, 0, assets.target.key)
      .setDisplaySize(board.cellSize * board.targetScale, board.cellSize * board.targetScale);
    this.root.add(this.target);

    for (let index = 0; index < board.hitChipPoolSize; index += 1) {
      const chip = this.scene.add.image(0, 0, assets.breakDebris.key)
        .setDisplaySize(board.hitChipSize, board.hitChipSize)
        .setVisible(false);
      this.hitChipPool.push(chip);
      this.root.add(chip);
    }
    for (let index = 0; index < board.debrisPoolSize; index += 1) {
      const debris = this.scene.add.image(0, 0, assets.breakDebris.key)
        .setDisplaySize(board.debrisSize, board.debrisSize)
        .setVisible(false);
      this.debrisPool.push(debris);
      this.root.add(debris);
    }
    for (let index = 0; index < board.breakBurstPoolSize; index += 1) {
      const burst = this.scene.add.image(0, 0, assets.breakBurst.key)
        .setDisplaySize(board.breakBurstSize, board.breakBurstSize)
        .setVisible(false);
      this.breakBurstPool.push(burst);
      this.root.add(burst);
    }

    const preparePickaxe = image => image
      .setDisplaySize(board.pickaxeSize, board.pickaxeSize)
      .setOrigin(board.pickaxeOriginX, board.pickaxeOriginY)
      .setFlipX(board.pickaxeFlipX);
    this.pickaxeGhost = preparePickaxe(
      this.scene.add.image(0, 0, assets.pickaxeTiers[0].key),
    )
      .setTint(0xffd8a1)
      .setAlpha(0)
      .setVisible(false);
    this.pickaxe = this.scene.add.image(0, 0, assets.pickaxeTiers[0].key)
      .setDisplaySize(board.pickaxeSize, board.pickaxeSize)
      .setOrigin(board.pickaxeOriginX, board.pickaxeOriginY)
      .setFlipX(board.pickaxeFlipX)
      .setAngle(timing.pickaxeRestAngleDeg);
    this.root.add([this.pickaxeGhost, this.pickaxe]);

    this.cells.flat().forEach(view => this._applyCell(view));
    const targetScaleX = this.target.scaleX;
    const targetScaleY = this.target.scaleY;
    this.targetTween = this.scene.tweens.add({
      targets: this.target,
      alpha: { from: timing.targetMinAlpha, to: timing.targetMaxAlpha },
      scaleX: { from: targetScaleX * timing.targetMinScale, to: targetScaleX * timing.targetMaxScale },
      scaleY: { from: targetScaleY * timing.targetMinScale, to: targetScaleY * timing.targetMaxScale },
      duration: timing.targetPulseMs,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  _textStyle(fontSize, color) {
    const text = this.config.layout.text;
    return {
      fontFamily: UI_FONTS.mono,
      fontSize,
      color,
      stroke: text.strokeColor,
      strokeThickness: text.strokeThickness,
      align: "center",
    };
  }

  _addCounter(x, label) {
    const { board, text } = this.config.layout;
    const frame = this.scene.add.image(x, board.centerY + board.counterY, this.config.assets.counterFrame.key)
      .setDisplaySize(board.counterWidth, board.counterHeight);
    const value = this.scene.add.text(
      x,
      board.centerY + board.counterY,
      `${label} 0`,
      this._textStyle(text.counterFontSize, text.counterColor),
    ).setOrigin(0.5);
    this.root.add([frame, value]);
    return value;
  }

  _applyCell(view) {
    const cell = this.state.getCell(view.row, view.column);
    view.block.setTexture(cell.material.textureKey);
    const damageRatio = 1 - cell.hp / cell.maxHp;
    view.fracture
      .setVisible(damageRatio > 0)
      .setAlpha(Phaser.Math.Linear(
        this.config.timing.fractureMinAlpha,
        this.config.timing.fractureMaxAlpha,
        damageRatio,
      ));
  }

  _bindInput() {
    this._stopHold = () => { this.pointerHeld = false; };
    this.scene.input.on("pointerup", this._stopHold);
    this.scene.input.on("gameout", this._stopHold);
    this.holdTimer = this.scene.time.addEvent({
      delay: this.config.timing.holdIntervalMs,
      loop: true,
      callback: () => {
        if (this.pointerHeld && !this.paused) this._mine();
      },
    });
    this._keyboardHandlers = {
      "keydown-LEFT": () => this._moveSelection(0, -1),
      "keydown-RIGHT": () => this._moveSelection(0, 1),
      "keydown-UP": () => this._moveSelection(-1, 0),
      "keydown-DOWN": () => this._moveSelection(1, 0),
      "keydown-SPACE": () => this._mine(),
      "keydown-ENTER": () => this._mine(),
    };
    Object.entries(this._keyboardHandlers).forEach(([event, handler]) => {
      this.scene.input.keyboard?.on(event, handler);
    });
    this.scene.events.once("shutdown", this.destroy, this);
  }

  _startHold(row, column) {
    if (this.paused) return;
    this._select(row, column);
    this.pointerHeld = true;
    this._mine();
  }

  _moveSelection(deltaRow, deltaColumn) {
    if (this.paused) return;
    this.state.moveSelection(deltaRow, deltaColumn);
    this._syncTarget();
  }

  _select(row, column) {
    if (this.paused) return;
    this.state.select(row, column);
    this._syncTarget();
  }

  _syncTarget() {
    const { row, column } = this.state.selected;
    const view = this.cells[row][column];
    const board = this.config.layout.board;
    this.target.setPosition(view.root.x, view.baseY);
    const tier = this.config.assets.pickaxeTiers[this.state.getPickaxeTierIndex()];
    [this.pickaxeGhost, this.pickaxe].forEach(image => {
      image
        .setPosition(
          view.root.x + board.pickaxeOffsetX,
          view.baseY + board.pickaxeOffsetY,
        )
        .setTexture(tier.key)
        .setDisplaySize(board.pickaxeSize, board.pickaxeSize);
    });
    this._publishDiagnostics();
  }

  _mine() {
    if (this.paused || this.destroyed) return;
    const event = this.state.mineSelected(this.scene.time.now);
    if (!event) return;
    const view = this.cells[event.row][event.column];
    this.fx.swingPickaxe(view, event.kind);
    if (event.kind === "hit") {
      this._applyCell(view);
      this.fx.animateHit(view);
    } else {
      this.fx.dropColumn(event.column, event.changedRows);
      this.blocksFrame.setText(`${this.config.copy.blocksMined} ${event.blocksMined}`);
      this.chainFrame.setText(`${this.config.copy.bestChain} x${event.bestChain}`);
      this._syncTarget();
    }
    this._publishDiagnostics();
  }

  _publishDiagnostics() {
    const key = this.config.diagnostics.globalKey;
    globalThis[key] = {
      active: !this.destroyed,
      paused: this.paused,
      assetsReady: true,
      ...this.state.getSnapshot(),
      ...(this.fx?.getSnapshot() || {}),
    };
  }

  setPaused(paused) {
    this.paused = paused === true;
    if (this.paused) this.pointerHeld = false;
    this._publishDiagnostics();
  }

  setVisible(visible) {
    this.root?.setVisible(visible === true);
    this.setPaused(visible !== true);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.paused = true;
    this.pointerHeld = false;
    this.holdTimer?.remove();
    this.targetTween?.stop();
    this.fx?.destroy();
    this.scene.input.off("pointerup", this._stopHold);
    this.scene.input.off("gameout", this._stopHold);
    Object.entries(this._keyboardHandlers || {}).forEach(([event, handler]) => {
      this.scene.input.keyboard?.off(event, handler);
    });
    this.scene.events.off("shutdown", this.destroy, this);
    if (this.root?.scene) this.root.destroy(true);
    this._publishDiagnostics();
  }
}

export function createLoadingMiningMinigame(scene, options = {}) {
  const config = options.config || LOADING_MINING_MINIGAME_CONFIG;
  if (!hasLoadingMiningMinigameAssets(scene, config, options.search)) return null;
  return new LoadingMiningMinigameView(scene, { ...options, config });
}
