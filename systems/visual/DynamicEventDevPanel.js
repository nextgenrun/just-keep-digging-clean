import { placeEventOnScreen } from "./eventScreenLayout.js";
import { DYNAMIC_EVENT_HEALTH as cfg } from "../../values/dynamicEventHealth.js";
import { WURM_SIZES, WURM_DIFFICULTIES } from "../../values/graveborerWurmVariants.js";
import { EARTHQUAKE_FEEDBACK_CONFIG } from "../../values/earthquakeFeedback.js";
import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { getBakedUiLabel, fitBakedUiImage, createBakedUiPanel, fitLiveUiText } from "./bakedUiArt.js";
import { hasEscapeClosableUi } from "../../world/playScene/hasEscapeClosableUi.js";

export class DynamicEventDevPanel {
  constructor(scene, runtime) {
    this.scene = scene; this.runtime = runtime; this.open = false; this.rows = new Map();
    this.sizeIndex = 2; this.difficultyIndex = 0; this.signalProfileIndex = 0;
    const d = cfg.dev, font = APPROVED_HUD_SKIN.font;
    this.style = { fontFamily: font.family, fontSize: d.textSize, color: font.color,
      stroke: font.shadow, strokeThickness: font.strokeThickness };
    this.root = scene.add.container(d.x, scene.scale.height - d.bottom).setScrollFactor(0).setDepth(d.depth).setVisible(false);
    this.root.add(createBakedUiPanel(scene, 0, 0, d.width, d.height)
      || scene.add.image(0, 0, EARTHQUAKE_FEEDBACK_CONFIG.assets.statusFrame.key).setDisplaySize(d.width, d.height));
    this.heading = scene.add.text(0, -d.height / 2 + d.buttonHeight, "", { ...this.style, fontSize: d.headerSize }).setOrigin(0.5);
    this.root.add(this.heading);
    cfg.ids.forEach((id, index) => {
      const y = d.rowStart + index * d.rowGap;
      this._button(this.root, d.rowButtonX, y, cfg.names[id], () => runtime.request(id, {
        survivorId: cfg.labels.signalProfiles[this.signalProfileIndex],
        ...(cfg.labels.signalProfiles[this.signalProfileIndex] === "explosive" ? { kind: "explosive" } : {}),
        size: WURM_SIZES[this.sizeIndex].id, difficulty: WURM_DIFFICULTIES[this.difficultyIndex].id,
      }));
      const text = scene.add.text(d.rowStatusX, y, "", { ...this.style, wordWrap: { width: d.statusWidth } }).setOrigin(0, 0.5);
      this.root.add(text); this.rows.set(id, text);
    });
    this.signalButton = this._button(this.root, -d.selectX, d.signalSelectY, "", () => {
      this.signalProfileIndex = (this.signalProfileIndex + 1) % cfg.labels.signalProfiles.length; this._labels();
    });
    this._button(this.root, d.selectX, d.signalSelectY, cfg.labels.signalLab, () => {
      this.scene.game.canvas.ownerDocument.defaultView.open(cfg.labels.signalLabPath, "_blank", "noopener");
    });
    this.sizeButton = this._button(this.root, -d.selectX, d.selectY, "", () => {
      this.sizeIndex = (this.sizeIndex + 1) % WURM_SIZES.length; this._labels();
    });
    this.difficultyButton = this._button(this.root, d.selectX, d.selectY, "", () => {
      this.difficultyIndex = (this.difficultyIndex + 1) % WURM_DIFFICULTIES.length; this._labels();
    });
    this._button(this.root, -d.selectX, d.footerY, cfg.labels.cancel, () => runtime.cancel());
    this._button(this.root, d.selectX, d.footerY, cfg.labels.lab, () => {
      this.scene.game.canvas.ownerDocument.defaultView.open(cfg.labels.labPath, "_blank", "noopener");
    });
    this.launcher = scene.add.container(d.launcherX, scene.scale.height - d.launcherBottom)
      .setScrollFactor(0).setDepth(d.depth);
    this._button(this.launcher, 0, 0, cfg.labels.events, () => this.toggle());
    this.onKey = event => {
      if (!runtime.canUseShortcut() || hasEscapeClosableUi(scene) || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || event.repeat || scene._settingsKeyCaptureActive || scene.gameState !== "playing") return;
      this.toggle(); event.preventDefault?.();
    };
    scene.input?.keyboard?.on("keydown-" + d.key, this.onKey);
    this._visibilityHandler = () => this._syncVisibility();
    scene.events?.on("postupdate", this._visibilityHandler);
    this._labels();
  }
  _labels() {
    this.signalButton.setText(cfg.names.signal + ": " + cfg.labels.signalProfiles[this.signalProfileIndex].toUpperCase());
    this._fitButton(this.signalButton);
    this.sizeButton.setText(cfg.labels.size + ": " + WURM_SIZES[this.sizeIndex].label);
    this.difficultyButton.setText(cfg.labels.difficulty + ": " + WURM_DIFFICULTIES[this.difficultyIndex].label);
    this._fitButton(this.sizeButton); this._fitButton(this.difficultyButton);
  }
  _fitButton(text) { return fitLiveUiText(text, cfg.dev.buttonTextWidth, cfg.dev.buttonTextHeight); }
  _button(parent, x, y, label, action) {
    const d = cfg.dev;
    const baked = getBakedUiLabel(this.scene, label);
    const art = baked ? fitBakedUiImage(this.scene.add.image(x,y,baked.key,baked.frame),d.buttonWidth,d.buttonHeight)
      : createBakedUiPanel(this.scene,x,y,d.buttonWidth,d.buttonHeight)
        || this.scene.add.image(x,y,EARTHQUAKE_FEEDBACK_CONFIG.assets.statusFrame.key).setDisplaySize(d.buttonWidth,d.buttonHeight);
    art.setScrollFactor(0);
    const text = this.scene.add.text(x, y, label, this.style).setOrigin(0.5);
    if (baked) text.setVisible(false);
    this._fitButton(text);
    const hit = this.scene.add.zone(x,y,d.buttonWidth,d.buttonHeight).setScrollFactor(0).setInteractive({useHandCursor:true});
    hit.on("pointerdown", (_pointer, _x, _y, event) => { event?.stopPropagation?.(); action(); });
    parent.add([art, text, hit]); return text;
  }
  toggle() { this.open = !this.open; this.root.setVisible(this.open); }
  _syncVisibility() {
    const playing = this.scene.gameState === "playing" && !hasEscapeClosableUi(this.scene);
    this.launcher.setVisible(playing); this.root.setVisible(playing && this.open);
  }
  update(snapshot) {
    this._syncVisibility();
    const d = cfg.dev;
    placeEventOnScreen(this.scene, this.root, d.x, this.scene.scale.height - d.bottom);
    placeEventOnScreen(this.scene, this.launcher, d.launcherX, this.scene.scale.height - d.launcherBottom);
    const latest = snapshot.history?.at(-1);
    this.heading.setText((snapshot.ready ? cfg.labels.healthy : cfg.labels.fault)
      + (latest ? "\n" + latest.id.toUpperCase() + " · " + latest.outcome : ""));
    fitLiveUiText(this.heading, d.headingWidth, d.headingHeight);
    for (const [id, text] of this.rows) {
      const row = snapshot.events[id];
      if (row) {
        text.setText(row.status + " · " + row.starts + "/" + row.completions + "\n"
          + (row.issue || (row.active ? row.phase : row.reason) || row.phase));
        fitLiveUiText(text, d.statusWidth, d.statusHeight);
      }
    }
  }
  destroy() {
    this.scene.input?.keyboard?.off("keydown-" + cfg.dev.key, this.onKey);
    this.scene.events?.off("postupdate", this._visibilityHandler);
    this.root.destroy(true); this.launcher.destroy(true); this.scene = null;
  }
}
