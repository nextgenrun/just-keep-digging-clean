import {
  resolveTitanStatueLoreEnabled,
} from "../../values/titanDiscoveries.js";
import { getTitanLoreEntry } from "../../values/titanLore.js";
import { USER_SETTINGS } from "../UserSettings.js";

export class TitanSurfaceInspection {
  constructor(
    scene,
    worldModel,
    config,
    search = globalThis.location?.search || ""
  ) {
    this.scene = scene;
    this.worldModel = worldModel;
    this.config = config;
    this.enabled = resolveTitanStatueLoreEnabled(config, search);
    this.records = new Map();
    this.activeId = "";
    this.lastInspectedId = "";
  }

  syncView(view, discovered) {
    if (!this.enabled || !view?.definition?.id) return;
    let record = this.records.get(view.definition.id);
    if (!record && discovered) {
      record = {
        view,
        discovered: true,
        prompt: this._createPrompt(view),
      };
      this.records.set(view.definition.id, record);
    }
    if (!record) return;
    record.view = view;
    record.discovered = Boolean(discovered);
    record.prompt?.setVisible(false);
  }

  getDistance(playerTile) {
    return this._nearest(playerTile)?.distance ?? Number.POSITIVE_INFINITY;
  }

  update(playerTile, keys, options = {}) {
    const nearest = this._nearest(playerTile);
    const allowInspect = options.allowInspect !== false;
    this.activeId = nearest && allowInspect
      ? nearest.record.view.definition.id
      : "";
    for (const record of this.records.values()) {
      const visible = Boolean(
        allowInspect
        && nearest
        && record.view.definition.id === nearest.record.view.definition.id
      );
      record.prompt?.setVisible(visible);
      if (visible) {
        const prompt = this._promptText(record.view.definition);
        if (record.prompt.text !== prompt) record.prompt.setText(prompt);
      }
    }
    if (!nearest || !allowInspect || !keys?.interact) return false;
    const justDown = globalThis.Phaser?.Input?.Keyboard?.JustDown;
    if (typeof justDown !== "function" || !justDown(keys.interact)) return false;
    return this._inspect(nearest.record.view.definition);
  }

  _nearest(playerTile) {
    if (!this.enabled || !playerTile) return null;
    const surfaceTileY = Math.max(0, this.worldModel.topAirRows - 1);
    let nearest = null;
    for (const record of this.records.values()) {
      if (!record.discovered) continue;
      const tileX = record.view.plinth.x / this.worldModel.tileSize;
      const distance = Math.abs(playerTile.tx - tileX)
        + Math.abs(playerTile.ty - surfaceTileY);
      if (
        distance <= this.config.surfaceGallery.inspectionRangeTiles
        && (
          !nearest
          || distance < nearest.distance
          || (
            distance === nearest.distance
            && record.view.definition.index
              < nearest.record.view.definition.index
          )
        )
      ) {
        nearest = { record, distance };
      }
    }
    return nearest;
  }

  _createPrompt(view) {
    if (!this.enabled || !this.scene.add?.text) return null;
    const gallery = this.config.surfaceGallery;
    const tileSize = this.worldModel.tileSize;
    const plinthTopY = view.plinth.y - gallery.plinthHeightTiles * tileSize;
    const promptY = plinthTopY
      + gallery.inspectionPromptOffsetTiles * tileSize;
    const prompt = this.scene.add.text(
      view.plinth.x,
      promptY,
      this._promptText(view.definition),
      {
        fontFamily: "Consolas, monospace",
        fontSize: `${gallery.inspectionPromptFontSizePx}px`,
        color: gallery.inspectionPromptColor,
        stroke: gallery.inspectionPromptStrokeColor,
        strokeThickness: gallery.inspectionPromptStrokeThicknessPx,
        align: "center",
      }
    )
      .setOrigin(0.5, 0)
      .setDepth(gallery.inspectionPromptDepth)
      .setAlpha(gallery.inspectionPromptPulseMinAlpha)
      .setVisible(false);
    this.scene.tweens?.add?.({
      targets: prompt,
      alpha: {
        from: gallery.inspectionPromptPulseMinAlpha,
        to: gallery.inspectionPromptPulseMaxAlpha,
      },
      duration: gallery.inspectionPromptPulseMs,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
    return prompt;
  }

  _promptText(definition) {
    const gallery = this.config.surfaceGallery;
    return `[${USER_SETTINGS.getKeyLabel("interact")}] `
      + `${gallery.inspectionPromptCopy} ${definition.name.toUpperCase()}`;
  }

  _inspect(definition) {
    const lore = getTitanLoreEntry(definition?.id);
    if (!definition || !lore) return false;
    const gallery = this.config.surfaceGallery;
    this.lastInspectedId = definition.id;
    const title = `${definition.name.toUpperCase()} — ${lore.epithet.toUpperCase()}`;
    const body = [
      `“${lore.inscription}”`,
      gallery.inspectionArchiveHint,
    ].join("\n\n");
    if (typeof this.scene.showGameDialog === "function") {
      this.scene.showGameDialog(title, body);
    } else {
      this.scene.hudSystem?.flashStatus?.(
        `${title}  •  ${lore.inscription}`,
        undefined,
        5000,
      );
    }
    return true;
  }

  getSnapshot() {
    return {
      inspectionEnabled: this.enabled,
      inspectable: [...this.records.values()]
        .filter(record => record.discovered)
        .length,
      activeInspection: this.activeId,
      lastInspected: this.lastInspectedId,
    };
  }

  destroy() {
    for (const record of this.records.values()) {
      this.scene.tweens?.killTweensOf?.(record.prompt);
      record.prompt?.destroy?.();
    }
    this.records.clear();
    this.activeId = "";
    this.lastInspectedId = "";
  }
}
