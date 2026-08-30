import { ASSET_KEYS } from "../../values/assetKeys.js";
import { APPROVED_HUD_SKIN } from "../../values/approvedHudSkin.js";
import { GAME_WIKI } from "../../values/gameWiki.js";
import { openGameWiki } from "./gameWikiLink.js";

function textureExists(scene, key) {
  return Boolean(key && scene?.textures?.exists?.(key));
}

export class HudWikiShortcut {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.config = options.config || GAME_WIKI.shortcut;
    this.depth = Number(options.depth) || 0;
    this.visible = options.visible !== false;
    this.anchorProvider = typeof options.anchorProvider === "function"
      ? options.anchorProvider
      : () => null;
    this.container = null;
    this.frame = null;
    this.label = null;
    this.hit = null;
    this._destroyed = false;
    this._create();
  }

  _create() {
    const textureKey = ASSET_KEYS.ui.approvedHud.buffChip;
    if (this.config.enabled !== true || !textureExists(this.scene, textureKey)) return;
    this.container = this.scene.add.container(0, 0)
      .setScrollFactor(0)
      .setDepth(this.depth)
      .setVisible(this.visible);
    this.hit = this.scene.add.zone(0, 0, 1, 1)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.frame = this.scene.add.image(0, 0, textureKey);
    this.label = this.scene.add.text(0, 0, this.config.label, {
      fontFamily: APPROVED_HUD_SKIN.font.family,
      fontSize: `${this.config.fontSize}px`,
      fontStyle: "bold",
      color: this.config.color,
      stroke: this.config.stroke,
      strokeThickness: this.config.strokeThickness,
    }).setOrigin(0.5);
    this.container.add([this.hit, this.frame, this.label]);
    this._wireInput();
  }

  _wireInput() {
    this.hit?.on("pointerdown", (_pointer, _x, _y, event) => {
      event?.stopPropagation?.();
      if (this._destroyed || this.container?.visible === false) return;
      if (!openGameWiki()) return;
      this.scene.soundSystem?.playUiSelect?.();
      this._press();
    });
    this.hit?.on("pointerover", () => {
      if (!this._destroyed) this.frame?.setAlpha?.(this.config.hoverAlpha);
    });
    this.hit?.on("pointerout", () => {
      if (!this._destroyed) this.frame?.setAlpha?.(1);
    });
  }

  resize(viewport = {}) {
    if (!this.container) return;
    const reference = APPROVED_HUD_SKIN.referenceViewport;
    const width = viewport.width || this.scene.scale?.width || reference.width;
    const height = viewport.height || this.scene.scale?.height || reference.height;
    const scale = Math.min(width / reference.width, height / reference.height);
    const displayWidth = Math.max(this.config.minimumDisplayWidth, this.config.width * scale);
    const displayHeight = Math.max(this.config.minimumDisplayHeight, this.config.height * scale);
    const anchor = this.anchorProvider() || {};
    const x = Number.isFinite(anchor.x)
      ? anchor.x
      : width - this.config.right * scale - displayWidth / 2;
    const y = Number.isFinite(anchor.y)
      ? anchor.y - (Number(anchor.height) || 0) / 2
        - this.config.gapAboveMap * scale - displayHeight / 2
      : height - displayHeight / 2 - 14 * scale;
    this.container.setPosition(x, y);
    this.frame.setDisplaySize(displayWidth, displayHeight);
    this.label.setFontSize(Math.max(10, Math.round(this.config.fontSize * scale)));
    const hitWidth = Math.max(
      this.config.minimumHitSize,
      displayWidth + this.config.hitPaddingX * 2 * scale,
    );
    const hitHeight = Math.max(
      this.config.minimumHitSize,
      displayHeight + this.config.hitPaddingY * 2 * scale,
    );
    this.hit.setSize(hitWidth, hitHeight);
    this.hit.input?.hitArea?.setTo?.(0, 0, hitWidth, hitHeight);
  }

  _press() {
    if (!this.container || !this.scene?.tweens) return;
    this.scene.tweens.killTweensOf(this.container);
    this.container.setScale(1);
    this.scene.tweens.add({
      targets: this.container,
      scale: this.config.pressScale,
      duration: this.config.pressMs,
      yoyo: true,
      ease: "Quad.out",
    });
  }

  setVisible(value) {
    this.visible = value === true;
    this.container?.setVisible(this.visible);
  }

  getHealthSnapshot() {
    return {
      active: Boolean(this.container),
      visible: this.container?.visible === true,
      label: this.label?.text || "",
      width: this.frame?.displayWidth || 0,
      height: this.frame?.displayHeight || 0,
      hitWidth: this.hit?.input?.hitArea?.width || 0,
      hitHeight: this.hit?.input?.hitArea?.height || 0,
    };
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.hit?.removeAllListeners?.();
    this.scene?.tweens?.killTweensOf?.(this.container);
    this.container?.destroy(true);
    this.container = null;
    this.frame = null;
    this.label = null;
    this.hit = null;
    this.scene = null;
  }
}
