import { ASSET_KEYS } from "../../values/assetKeys.js";
import { HARDCORE_MODE_CONFIG } from "../../values/hardcoreMode.js";
import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";

export class HardcoreStatusHud {
  constructor(scene, config = HARDCORE_MODE_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.layout = config.ui.statusHud;
    this.root = null;
    this.frame = null;
    this.crest = null;
    this.label = null;
    this.detail = null;
    this._lastSignature = "";
    this._create();
  }

  _create() {
    const frameKey = ASSET_KEYS.ui.approvedHud.notification;
    const crestKey = ASSET_KEYS.ui.hardcore.oathCrest;
    if (!this.scene.textures.exists(frameKey) || !this.scene.textures.exists(crestKey)) {
      return;
    }

    const layout = this.layout;
    this.root = this.scene.add.container(layout.x, layout.y)
      .setScrollFactor(0)
      .setDepth(layout.depth)
      .setVisible(false);
    this.frame = this.scene.add.image(0, 0, frameKey)
      .setDisplaySize(layout.width, layout.height);
    this.crest = this.scene.add.image(
      -layout.width / 2 + layout.crestSize / 2 + 5,
      0,
      crestKey,
    ).setDisplaySize(layout.crestSize, layout.crestSize);
    this.label = this.scene.add.text(
      -layout.width / 2 + layout.crestSize + layout.textOffsetX,
      -10,
      "",
      {
        fontFamily: APPROVED_HUD_SKIN.font.family,
        fontSize: `${this.config.ui.font.statusTitlePx}px`,
        fontStyle: "bold",
        color: APPROVED_HUD_SKIN.font.color,
        stroke: APPROVED_HUD_SKIN.font.shadow,
        strokeThickness: APPROVED_HUD_SKIN.font.strokeThickness,
      },
    ).setOrigin(0, 0.5);
    this.detail = this.scene.add.text(
      -layout.width / 2 + layout.crestSize + layout.textOffsetX,
      10,
      "",
      {
        fontFamily: APPROVED_HUD_SKIN.font.family,
        fontSize: `${this.config.ui.font.statusBodyPx}px`,
        color: APPROVED_HUD_SKIN.font.secondary,
        stroke: APPROVED_HUD_SKIN.font.shadow,
        strokeThickness: 2,
      },
    ).setOrigin(0, 0.5);
    this.root.add([this.frame, this.crest, this.label, this.detail]);
  }

  update(snapshot, timeMs = 0, gp = 0) {
    if (!this.root) return;
    const visible = snapshot?.isHardcore === true;
    this.root.setVisible(visible);
    if (!visible) return;

    const stress = Math.round(snapshot.stress || 0);
    const band = snapshot.stressBand || "calm";
    const pending = snapshot.armed !== true;
    const signature = `${pending}:${stress}:${band}:${Math.floor(gp)}`;
    if (signature !== this._lastSignature) {
      this._lastSignature = signature;
      if (pending) {
        this.label.setText("HARDCORE OATH PENDING");
        this.detail.setText("ARMS THE MOMENT FLIGHT UNLOCKS");
        this.label.setColor("#f0c765");
        this.detail.setColor("#b9c8d3");
      } else {
        this.label.setText(`HARDCORE  •  STRESS ${stress}%`);
        this.detail.setText(
          gp <= 1
            ? "1 GP OR LESS  •  DEATH IS IMMINENT"
            : band === "critical"
              ? `PANIC DRAIN  ${snapshot.stressGpDrainPerSecond.toFixed(1)} GP/S`
              : band === "warning"
                ? "FIND LIGHT  •  SLOW YOUR DESCENT"
                : "0 GP DELETES THIS SAVE",
        );
        this.label.setColor(band === "critical" ? "#ff7468" : band === "warning" ? "#f0c765" : "#f4e8c8");
        this.detail.setColor(gp <= 1 || band === "critical" ? "#ff8b7f" : "#b9c8d3");
      }
    }

    const hz = band === "critical"
      ? this.layout.criticalPulseHz
      : band === "warning"
        ? this.layout.warningPulseHz
        : 0;
    const pulse = hz > 0
      ? Math.sin((Number(timeMs) || 0) * 0.001 * Math.PI * 2 * hz)
      : 0;
    const scale = 1 + Math.max(0, pulse) * this.layout.pulseScale;
    this.root.setScale(scale);
    this.frame.setAlpha(band === "critical" ? 0.88 + Math.max(0, pulse) * 0.12 : 1);
  }

  destroy() {
    this.root?.destroy(true);
    this.root = null;
    this.frame = null;
    this.crest = null;
    this.label = null;
    this.detail = null;
    this.scene = null;
  }
}
