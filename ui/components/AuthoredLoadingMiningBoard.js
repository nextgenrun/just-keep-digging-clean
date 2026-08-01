import { UI_FONTS } from "../../values/uiLayout.js";

export class AuthoredLoadingMiningBoard {
  constructor(scene, config, state, {
    onSelect,
    onStartHold,
  }) {
    this.scene = scene;
    this.config = config;
    this.state = state;
    this.onSelect = onSelect;
    this.onStartHold = onStartHold;
    this.cells = [];
    this.hitChipPool = [];
    this.debrisPool = [];
    this.breakBurstPool = [];
    this.toolIcons = [];
    this._build();
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
    const offsetX = (viewportWidth - layout.referenceWidth * scale) / 2;
    const offsetY = (viewportHeight - layout.referenceHeight * scale) / 2;
    this.root = this.scene.add.container(
      offsetX + board.centerX * scale,
      offsetY + board.centerY * scale,
    ).setScale(scale * board.presentationScale);
    this.blocksCounter = this._addCounter(-board.counterX, copy.blocksMined);
    this.chainCounter = this._addCounter(board.counterX, copy.bestChain);
    this._buildCells();

    this.target = this.scene.add.image(0, 0, assets.target.key)
      .setDisplaySize(
        board.cellSize * board.targetScale,
        board.cellSize * board.targetScale,
      );
    this.root.add(this.target);
    this._buildFxPools();
    this._buildToolRail();
    this._buildPickaxe();
    this.cells.flat().forEach(view => this.applyCell(view));

    this.targetTween = this.scene.tweens.add({
      targets: this.target,
      alpha: { from: timing.targetMinAlpha, to: timing.targetMaxAlpha },
      scaleX: {
        from: this.target.scaleX * timing.targetMinScale,
        to: this.target.scaleX * timing.targetMaxScale,
      },
      scaleY: {
        from: this.target.scaleY * timing.targetMinScale,
        to: this.target.scaleY * timing.targetMaxScale,
      },
      duration: timing.targetPulseMs,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  _style(fontSize, color) {
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
    const frame = this.scene.add.image(
      x,
      board.counterY,
      this.config.assets.counterFrame.key,
    ).setDisplaySize(board.counterWidth, board.counterHeight);
    const value = this.scene.add.text(
      x,
      board.counterY,
      `${label} 0`,
      this._style(text.counterFontSize, text.counterColor),
    ).setOrigin(0.5);
    this.root.add([frame, value]);
    return value;
  }

  _buildCells() {
    const { board } = this.config.layout;
    const assets = this.config.assets;
    const gridWidth = board.columns * board.cellSize
      + (board.columns - 1) * board.cellGap;
    const left = -gridWidth / 2 + board.cellSize / 2;
    const pitch = board.cellSize + board.cellGap;
    for (let row = 0; row < board.rows; row += 1) {
      const rowViews = [];
      for (let column = 0; column < board.columns; column += 1) {
        const x = left + column * pitch;
        const y = board.gridTopY + row * pitch + board.cellSize / 2;
        const root = this.scene.add.container(x, y);
        const block = this.scene.add.image(
          0,
          0,
          assets.materials[0].textureKey,
        )
          .setDisplaySize(board.cellSize, board.cellSize)
          .setInteractive({ useHandCursor: true });
        const fracture = this.scene.add.image(
          0,
          0,
          assets.hitFracture.key,
        )
          .setDisplaySize(
            board.cellSize * board.fractureScale,
            board.cellSize * board.fractureScale,
          )
          .setVisible(false);
        root.add([block, fracture]);
        this.root.add(root);
        const view = {
          root,
          block,
          fracture,
          baseY: y,
          row,
          column,
        };
        block
          .on("pointerover", () => this.onSelect(row, column))
          .on("pointerdown", () => this.onStartHold(row, column));
        rowViews.push(view);
      }
      this.cells.push(rowViews);
    }
  }

  _addPool(target, count, key, size) {
    for (let index = 0; index < count; index += 1) {
      const image = this.scene.add.image(0, 0, key)
        .setDisplaySize(size, size)
        .setVisible(false);
      target.push(image);
      this.root.add(image);
    }
  }

  _buildFxPools() {
    const { board } = this.config.layout;
    const assets = this.config.assets;
    this._addPool(
      this.hitChipPool,
      board.hitChipPoolSize,
      assets.breakDebris.key,
      board.hitChipSize,
    );
    this._addPool(
      this.debrisPool,
      board.debrisPoolSize,
      assets.breakDebris.key,
      board.debrisSize,
    );
    this._addPool(
      this.breakBurstPool,
      board.breakBurstPoolSize,
      assets.breakBurst.key,
      board.breakBurstSize,
    );
  }

  _buildToolRail() {
    const { board, text } = this.config.layout;
    this.config.assets.pickaxeTiers.forEach((tier, index) => {
      const icon = this.scene.add.image(
        board.toolSlotOffsetsX[index],
        board.toolRailY,
        tier.key,
      ).setDisplaySize(board.toolIconSize, board.toolIconSize);
      this.toolIcons.push(icon);
      this.root.add(icon);
    });
    this.toolTierLabel = this.scene.add.text(
      0,
      board.toolTierLabelY,
      "",
      this._style(text.materialFontSize, text.tierColor),
    ).setOrigin(0.5);
    this.root.add(this.toolTierLabel);
  }

  _buildPickaxe() {
    const { board } = this.config.layout;
    const timing = this.config.timing;
    const prepare = image => image
      .setDisplaySize(board.pickaxeSize, board.pickaxeSize)
      .setOrigin(board.pickaxeOriginX, board.pickaxeOriginY)
      .setFlipX(board.pickaxeFlipX)
      .setVisible(board.pickaxeRestVisible === true);
    this.pickaxeGhost = prepare(this.scene.add.image(
      0,
      0,
      this.config.assets.pickaxeTiers[0].key,
    )).setAlpha(0);
    this.pickaxe = prepare(this.scene.add.image(
      0,
      0,
      this.config.assets.pickaxeTiers[0].key,
    )).setAngle(timing.pickaxeRestAngleDeg);
    this.root.add([this.pickaxeGhost, this.pickaxe]);
  }

  applyCell(view) {
    const cell = this.state.getCell(view.row, view.column);
    const damageRatio = 1 - cell.hp / cell.maxHp;
    view.block.setTexture(cell.material.textureKey);
    view.fracture
      .setVisible(damageRatio > 0)
      .setAlpha(Phaser.Math.Linear(
        this.config.timing.fractureMinAlpha,
        this.config.timing.fractureMaxAlpha,
        damageRatio,
      ));
  }

  syncSelection() {
    const { row, column } = this.state.selected;
    const view = this.cells[row][column];
    const board = this.config.layout.board;
    const tierIndex = this.state.getPickaxeTierIndex();
    const tier = this.config.assets.pickaxeTiers[tierIndex];
    this.target.setPosition(view.root.x, view.baseY);
    [this.pickaxeGhost, this.pickaxe].forEach(image => image
      .setPosition(
        view.root.x + board.pickaxeOffsetX,
        view.baseY + board.pickaxeOffsetY,
      )
      .setTexture(tier.key)
      .setDisplaySize(board.pickaxeSize, board.pickaxeSize));
    this.toolIcons.forEach((icon, index) => {
      const active = index === tierIndex;
      const iconScale = active
        ? board.toolActiveScale
        : board.toolInactiveScale;
      icon
        .setDisplaySize(
          board.toolIconSize * iconScale,
          board.toolIconSize * iconScale,
        )
        .setAlpha(active ? board.toolActiveAlpha : board.toolInactiveAlpha);
    });
    this.toolTierLabel.setText(`ACTIVE TOOL  ·  ${tier.label}`);
  }

  updateCounters(event) {
    this.blocksCounter.setText(
      `${this.config.copy.blocksMined} ${event.blocksMined}`,
    );
    this.chainCounter.setText(
      `${this.config.copy.bestChain} x${event.bestChain}`,
    );
  }

  destroy() {
    this.targetTween?.stop();
    this.root?.destroy(true);
  }
}
