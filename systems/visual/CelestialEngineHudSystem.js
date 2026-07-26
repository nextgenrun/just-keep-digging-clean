import { ASSET_KEYS } from "../../values/assetKeys.js";
import {
  CELESTIAL_ENGINE_CONFIG,
  CELESTIAL_ENGINE_IDS,
} from "../../values/celestialEngines.js";
import { UI_FONTS } from "../../values/uiLayout.js";

const ENGINE_ASSETS = Object.freeze({
  [CELESTIAL_ENGINE_IDS.WAYWARD_STAR]: ASSET_KEYS.celestialEngines.waywardStar,
  [CELESTIAL_ENGINE_IDS.HOLLOW_SUN]: ASSET_KEYS.celestialEngines.hollowSun,
  [CELESTIAL_ENGINE_IDS.COMET_ENGINE]: ASSET_KEYS.celestialEngines.cometEngine,
});

export class CelestialEngineHudSystem {
  constructor(scene, progression, getKeyLabel) {
    this.scene = scene;
    this.progression = progression;
    this.getKeyLabel = getKeyLabel;
    this.activeSnapshot = null;
    this._build();
    this.unsubscribe = progression.subscribe((snapshot, event) => {
      this.sync(snapshot);
      if (event === "charge-gained" || event === "engine-attuned") this.pulse();
    });
  }

  _build() {
    const cfg = CELESTIAL_ENGINE_CONFIG.hud;
    this.root = this.scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(cfg.depth)
      .setVisible(false);
    this.bg = this.scene.add.graphics();
    this.icon = this.scene.add.image(-cfg.widthPx / 2 + 31, 0, ASSET_KEYS.celestialEngines.starHeart)
      .setDisplaySize(cfg.iconPx, cfg.iconPx)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.title = this.scene.add.text(-cfg.widthPx / 2 + 59, -12, "", {
      fontFamily: UI_FONTS.display,
      fontSize: "12px",
      fontStyle: "bold",
      color: "#DDF9FF",
    }).setOrigin(0, 0.5);
    this.state = this.scene.add.text(-cfg.widthPx / 2 + 59, 7, "", {
      fontFamily: UI_FONTS.mono,
      fontSize: "10px",
      color: "#8FB8C8",
    }).setOrigin(0, 0.5);
    this.bar = this.scene.add.graphics();
    this.root.add([this.bg, this.icon, this.title, this.state, this.bar]);
    this.resize();
  }

  sync(snapshot) {
    this.snapshot = snapshot;
    const visible = Boolean(snapshot?.unlocked || snapshot?.selectedEngine);
    this.root.setVisible(visible);
    if (!visible) return;

    const definition = CELESTIAL_ENGINE_CONFIG.engines[snapshot.selectedEngine];
    const assetKey = ENGINE_ASSETS[snapshot.selectedEngine] || ASSET_KEYS.celestialEngines.starHeart;
    this.icon.setTexture(assetKey);
    this.title.setText(definition?.shortName || "STAR HEART READY");

    const key = this.getKeyLabel?.() || "X";
    const chargeText = `${snapshot.charge}/${snapshot.chargeCapacity}`;
    this.state.setText(
      snapshot.selectedEngine
        ? (snapshot.charged ? `${key} RELEASE  •  ${chargeText}` : `SKY CHARGE ${chargeText}`)
        : "E AT THE STAR PILLAR",
    );
    this._draw(snapshot, definition?.accent || 0x65e8ff);
  }

  setActiveSnapshot(snapshot) {
    this.activeSnapshot = snapshot;
    if (!snapshot || !this.snapshot) {
      this.sync(this.snapshot);
      return;
    }
    this.state.setText(
      `ACTIVE  •  ${snapshot.impacts}/${snapshot.maxImpacts} IMPACTS`,
    );
  }

  _draw(snapshot, accent) {
    const cfg = CELESTIAL_ENGINE_CONFIG.hud;
    const left = -cfg.widthPx / 2;
    const top = -cfg.heightPx / 2;
    this.bg.clear();
    this.bg.fillStyle(0x030911, 0.9);
    this.bg.fillRoundedRect(left, top, cfg.widthPx, cfg.heightPx, 10);
    this.bg.lineStyle(1, accent, 0.72);
    this.bg.strokeRoundedRect(left, top, cfg.widthPx, cfg.heightPx, 10);
    this.bg.fillStyle(0xf1c56c, 0.9);
    this.bg.fillRoundedRect(left + 5, top + 7, 3, cfg.heightPx - 14, 2);

    const barX = left + 59;
    const barY = top + cfg.heightPx - 12;
    const ratio = Math.max(0, Math.min(1, snapshot.charge / snapshot.chargeCapacity));
    this.bar.clear();
    this.bar.fillStyle(0x0b1c29, 1);
    this.bar.fillRoundedRect(barX, barY, cfg.barWidthPx, cfg.barHeightPx, 3);
    this.bar.fillStyle(accent, 0.95);
    this.bar.fillRoundedRect(barX, barY, cfg.barWidthPx * ratio, cfg.barHeightPx, 3);
  }

  pulse() {
    if (!this.root.visible) return;
    this.scene.tweens.killTweensOf(this.root);
    this.scene.tweens.add({
      targets: this.root,
      scale: 1.055,
      duration: CELESTIAL_ENGINE_CONFIG.hud.pulseMs,
      yoyo: true,
      ease: "Back.out",
    });
  }

  resize() {
    const cfg = CELESTIAL_ENGINE_CONFIG.hud;
    const width = Math.max(320, this.scene.scale?.width || 1280);
    const height = Math.max(240, this.scene.scale?.height || 720);
    this.root.setPosition(
      width - cfg.widthPx / 2 - cfg.marginPx,
      height - cfg.heightPx / 2 - cfg.marginPx,
    );
  }

  destroy() {
    this.unsubscribe?.();
    this.root?.destroy(true);
  }
}
