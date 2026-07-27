import {
  TITAN_DEFINITIONS,
  TITAN_DISCOVERY_CONFIG,
} from "../../values/titanDiscoveries.js";
import { TITAN_CLUE_CATALOG_CONFIG } from "../../values/titanClueCatalog.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { createButton, createPanel } from "../PhaserUiKit.js";
import { TitanArchiveClueControl } from "./TitanArchiveClueControl.js";
import { fitTitanArchiveImage, formatTitanArchiveIndex } from "./titanArchivePresentation.js";

export class TitanArchiveView {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.config = options.config || TITAN_DISCOVERY_CONFIG;
    this.definitions = this.config.definitions || TITAN_DEFINITIONS;
    this.discovered = new Set(
      options.retention?.getDiscoveredTitans?.() || []
    );
    this.parent = options.parent;
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.width = options.width || 900;
    this.height = options.height || 430;
    this.onFocus = options.onFocus || null;
    this.chamberProvider = options.chamberProvider || null;
    this.clueSystem = options.clueSystem || null;
    this.clueDirectionProvider = options.clueDirectionProvider || null;
    this.getPlayerTile = options.getPlayerTile || null;
    this.clueConfig = options.clueConfig || TITAN_CLUE_CATALOG_CONFIG;
    this.releasePortraitAsset = null;
    this.clueControl = null;
    this.selectionToken = 0;
    this.controls = [];
    this.root = scene.add.container(0, 0);
    this.parent?.add?.(this.root);
    this.selectedIndex = Math.max(
      0,
      this.definitions.findIndex(definition => this.discovered.has(definition.id))
    );
    this._build();
    this.select(this.selectedIndex);
  }

  _build() {
    const archive = this.config.archive;
    const gap = archive.panelGap;
    const gridWidth = Math.floor(this.width * archive.gridWidthFraction);
    const detailWidth = this.width - gridWidth - gap;
    this.gridPanel = createPanel(this.scene, {
      x: this.x + gridWidth / 2,
      y: this.y + this.height / 2,
      width: gridWidth,
      height: this.height,
      title: `TITAN ARCHIVE  •  ${this.discovered.size}/${this.definitions.length}`,
      icon: "journal",
      parent: this.root,
    });
    this.detailPanel = createPanel(this.scene, {
      x: this.x + gridWidth + gap + detailWidth / 2,
      y: this.y + this.height / 2,
      width: detailWidth,
      height: this.height,
      title: "ARCHIVE ENTRY",
      icon: "stats",
      parent: this.root,
      border: UI_COLORS.borderSel,
    });
    this._buildGrid(gridWidth);
    this._buildDetail(this.x + gridWidth + gap, detailWidth);
  }

  _buildGrid(gridWidth) {
    const archive = this.config.archive;
    const columns = archive.columns;
    const rows = archive.rows;
    const usableWidth = gridWidth - archive.panelInset * 2;
    const usableHeight = this.height
      - archive.panelHeaderHeight
      - archive.panelInset * 2;
    const slotSize = Math.min(
      archive.slotMaxSize,
      (usableWidth - archive.slotGap * (columns - 1)) / columns,
      (usableHeight - archive.slotGap * (rows - 1)) / rows
    );
    const gridActualWidth = columns * slotSize + (columns - 1) * archive.slotGap;
    const gridActualHeight = rows * slotSize + (rows - 1) * archive.slotGap;
    const startX = this.x + (gridWidth - gridActualWidth) / 2 + slotSize / 2;
    const startY = this.y + archive.panelHeaderHeight
      + (usableHeight - gridActualHeight) / 2
      + archive.panelInset
      + slotSize / 2;

    this.definitions.forEach((definition, index) => {
      const discovered = this.discovered.has(definition.id);
      const column = index % columns;
      const row = Math.floor(index / columns);
      let button;
      button = createButton(this.scene, {
        x: startX + column * (slotSize + archive.slotGap),
        y: startY + row * (slotSize + archive.slotGap),
        width: slotSize,
        height: slotSize,
        label: "",
        autoIcon: false,
        accent: definition.glowTint,
        parent: this.root,
        playSounds: true,
        onFocus: () => {
          this.select(index);
          this.onFocus?.(index);
        },
        onClick: () => this.select(index),
      });
      const thumbnail = this.scene.add.image(0, -2, definition.asset.key);
      fitTitanArchiveImage(
        thumbnail,
        slotSize - archive.thumbnailInset * 2,
        slotSize - archive.thumbnailInset * 2
      );
      thumbnail.setAlpha(
        discovered
          ? archive.discoveredThumbnailAlpha
          : archive.lockedThumbnailAlpha
      );
      if (!discovered) thumbnail.setTint(0x4a5c66);
      const indexText = this.scene.add.text(
        slotSize / 2 - 5,
        slotSize / 2 - 4,
        formatTitanArchiveIndex(definition.index),
        {
          fontFamily: UI_FONTS.mono,
          fontSize: `${archive.slotIndexFontSize}px`,
          color: discovered ? UI_COLORS.gold : UI_COLORS.dim,
        }
      ).setOrigin(1, 1);
      button.root.add([thumbnail, indexText]);
      button.thumbnail = thumbnail;
      this.controls.push(button);
    });
  }

  _buildDetail(detailX, detailWidth) {
    const archive = this.config.archive;
    const portraitTop = this.y + archive.panelHeaderHeight + archive.portraitInset;
    const portraitHeight = this.height * archive.portraitMaxHeightFraction;
    this.portrait = this.scene.add.image(
      detailX + detailWidth / 2,
      portraitTop + portraitHeight / 2,
      this.definitions[0].asset.key
    );
    this.root.add(this.portrait);
    const textTop = portraitTop + portraitHeight;
    this.detailTextTop = textTop;
    this.nameText = this.scene.add.text(
      detailX + detailWidth / 2,
      textTop + archive.titleOffsetY,
      "",
      {
        fontFamily: UI_FONTS.display,
        fontSize: `${archive.titleFontSize}px`,
        fontStyle: "bold",
        color: UI_COLORS.title,
        align: "center",
      }
    ).setOrigin(0.5, 0);
    this.regionText = this.scene.add.text(
      detailX + detailWidth / 2,
      textTop + archive.regionOffsetY,
      "",
      {
        fontFamily: UI_FONTS.mono,
        fontSize: `${archive.regionFontSize}px`,
        color: UI_COLORS.gold,
        align: "center",
      }
    ).setOrigin(0.5, 0);
    this.loreText = this.scene.add.text(
      detailX + archive.loreSideInset,
      textTop + archive.loreOffsetY,
      "",
      {
        fontFamily: UI_FONTS.body,
        fontSize: `${archive.loreFontSize}px`,
        color: UI_COLORS.body,
        align: "center",
        lineSpacing: 4,
        wordWrap: {
          width: detailWidth - archive.loreSideInset * 2,
          useAdvancedWrap: true,
        },
      }
    ).setOrigin(0, 0);
    this.root.add([this.nameText, this.regionText, this.loreText]);
    const clueLayout = this.clueConfig.layout;
    this.clueControl = new TitanArchiveClueControl(this.scene, {
      x: detailX + detailWidth / 2,
      y: this.y + this.height - clueLayout.bottomInsetPx,
      width: detailWidth - clueLayout.sideInsetPx * 2,
      parent: this.root,
      clueSystem: this.clueSystem,
      directionProvider: this.clueDirectionProvider,
      getPlayerTile: this.getPlayerTile,
      onFocus: () => this.onFocus?.(this.controls.length - 1),
    }, this.clueConfig);
    this.controls.push(this.clueControl.getControl());
  }

  select(index) {
    const safeIndex = Math.max(0, Math.min(this.definitions.length - 1, index));
    const definition = this.definitions[safeIndex];
    const discovered = this.discovered.has(definition.id);
    this.selectedIndex = safeIndex;
    this.controls.forEach((button, buttonIndex) => {
      button.setSelected(buttonIndex === safeIndex);
    });
    this._releasePortrait();
    const selectionToken = ++this.selectionToken;
    this._setPortrait(definition.asset.key, discovered);
    if (discovered && this.chamberProvider?.pinArchive) {
      this.releasePortraitAsset = this.chamberProvider.pinArchive(definition, {
        onReady: asset => {
          if (
            selectionToken === this.selectionToken
            && this.definitions[this.selectedIndex]?.id === definition.id
          ) {
            this._setPortrait(asset.key, true);
          }
        },
      });
    }
    this.nameText.setText(discovered ? definition.name.toUpperCase() : "UNDISCOVERED TITAN");
    this.regionText.setText(
      discovered
        ? `#${formatTitanArchiveIndex(definition.index)}  •  ${definition.regionLabel.toUpperCase()}`
        : `#${formatTitanArchiveIndex(definition.index)}  •  SEALED ENTRY`
    );
    this.loreText.setText(
      discovered
        ? definition.lore
        : this.clueConfig.copy.lockedLore
    );
    this.loreText.setY(
      this.detailTextTop + (
        discovered
          ? this.config.archive.loreOffsetY
          : this.clueConfig.layout.lockedLoreOffsetY
      )
    );
    this.clueControl?.setDefinition(definition, discovered);
  }

  _setPortrait(textureKey, discovered) {
    this.scene.tweens?.killTweensOf?.(this.portrait);
    this.portrait.setTexture(textureKey);
    fitTitanArchiveImage(
      this.portrait,
      this.detailPanel.width * this.config.archive.portraitMaxWidthFraction,
      this.height * this.config.archive.portraitMaxHeightFraction
    );
    this.portrait.setAlpha(
      discovered ? 1 : this.config.archive.portraitLockedAlpha
    );
    if (discovered) this.portrait.clearTint();
    else this.portrait.setTint(0x4a5c66);
    if (discovered && this.scene.tweens?.add) {
      const pulseScale = this.config.archive.vignettePulseScale;
      this.scene.tweens.add({
        targets: this.portrait,
        scaleX: this.portrait.scaleX * pulseScale,
        scaleY: this.portrait.scaleY * pulseScale,
        duration: this.config.archive.vignettePulseMs,
        ease: "Sine.InOut",
        yoyo: true,
        repeat: -1,
      });
    }
  }

  _releasePortrait() {
    this.releasePortraitAsset?.();
    this.releasePortraitAsset = null;
  }

  getControls() {
    return [...this.controls];
  }

  selectControl(index) { if (index >= 0 && index < this.definitions.length) this.select(index); }

  destroy() {
    this.selectionToken += 1;
    this._releasePortrait();
    this.clueControl?.destroy?.();
    this.clueControl = null;
    this.root?.destroy?.(true);
    this.controls = [];
  }
}
