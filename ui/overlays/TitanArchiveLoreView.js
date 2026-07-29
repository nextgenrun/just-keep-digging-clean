import { getTitanLoreEntry } from "../../values/titanLore.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { UI_FONTS } from "../../values/uiLayout.js";

export class TitanArchiveLoreView {
  constructor(scene, options) {
    this.scene = scene;
    this.parent = options.parent;
    this.archive = options.archive;
    this.clueConfig = options.clueConfig;
    this.textTop = options.textTop;
    this.detailX = options.detailX;
    this.detailWidth = options.detailWidth;
    this._build();
  }

  _build() {
    const archive = this.archive;
    const centerX = this.detailX + this.detailWidth / 2;
    const wrapWidth = this.detailWidth - archive.loreSideInset * 2;

    this.nameText = this.scene.add.text(
      centerX,
      this.textTop + archive.titleOffsetY,
      "",
      {
        fontFamily: UI_FONTS.display,
        fontSize: `${archive.titleFontSize}px`,
        fontStyle: "bold",
        color: UI_COLORS.title,
        align: "center",
      }
    ).setOrigin(0.5, 0);
    this.epithetText = this.scene.add.text(
      centerX,
      this.textTop + archive.epithetOffsetY,
      "",
      {
        fontFamily: UI_FONTS.display,
        fontSize: `${archive.epithetFontSize}px`,
        fontStyle: "italic",
        color: UI_COLORS.gold,
        align: "center",
      }
    ).setOrigin(0.5, 0);
    this.regionText = this.scene.add.text(
      centerX,
      this.textTop + archive.regionOffsetY,
      "",
      {
        fontFamily: UI_FONTS.mono,
        fontSize: `${archive.regionFontSize}px`,
        color: UI_COLORS.gold,
        align: "center",
      }
    ).setOrigin(0.5, 0);
    this.loreText = this.scene.add.text(
      this.detailX + archive.loreSideInset,
      this.textTop + archive.loreOffsetY,
      "",
      {
        fontFamily: UI_FONTS.body,
        fontSize: `${archive.loreFontSize}px`,
        color: UI_COLORS.body,
        align: "center",
        lineSpacing: archive.loreLineSpacingPx,
        wordWrap: { width: wrapWidth, useAdvancedWrap: true },
      }
    ).setOrigin(0, 0);
    this.inscriptionText = this.scene.add.text(
      centerX,
      this.textTop + archive.loreOffsetY,
      "",
      {
        fontFamily: UI_FONTS.body,
        fontSize: `${archive.inscriptionFontSize}px`,
        fontStyle: "italic",
        color: UI_COLORS.gold,
        align: "center",
        lineSpacing: archive.loreLineSpacingPx,
        wordWrap: { width: wrapWidth, useAdvancedWrap: true },
      }
    ).setOrigin(0.5, 0);
    this.parent?.add?.([
      this.nameText,
      this.epithetText,
      this.regionText,
      this.loreText,
      this.inscriptionText,
    ]);
  }

  setDefinition(definition, discovered) {
    const lore = discovered ? getTitanLoreEntry(definition.id) : null;
    this.nameText.setText(
      discovered ? definition.name.toUpperCase() : "UNDISCOVERED TITAN"
    );
    this.epithetText
      .setText(lore ? lore.epithet.toUpperCase() : "")
      .setVisible(Boolean(lore));
    this.regionText.setText(
      discovered
        ? `#${String(definition.index).padStart(2, "0")}  •  ${definition.regionLabel.toUpperCase()}`
        : `#${String(definition.index).padStart(2, "0")}  •  SEALED ENTRY`
    );
    this.loreText
      .setText(discovered ? lore?.archiveLore || "" : this.clueConfig.copy.lockedLore)
      .setY(
        this.textTop + (
          discovered
            ? this.archive.loreOffsetY
            : this.clueConfig.layout.lockedLoreOffsetY
        )
      );
    this.inscriptionText
      .setText(
        lore
          ? `${this.archive.inscriptionLabel}\n“${lore.inscription}”`
          : ""
      )
      .setY(this.loreText.y + this.loreText.height + this.archive.inscriptionGapPx)
      .setVisible(Boolean(lore));
    return lore;
  }
}
