import { USER_SETTINGS } from "../../systems/UserSettings.js";

// ─── Generated button texture keys ────────────────────────────────────────
export const MUTE_BTN_TEXTURES = Object.freeze({
  musicOn: "_hud_btn_music_on",
  musicOff: "_hud_btn_music_off",
  sfxOn: "_hud_btn_sfx_on",
  sfxOff: "_hud_btn_sfx_off",
});

// ─── In-engine texture generation ─────────────────────────────────────────
const BTN_SIZE = 40;
const BTN_RADIUS = 7;

function roundedRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function drawMusicNote(ctx, cx, cy, active) {
  const color = active ? "#f0d080" : "#6a7a8a";
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Staff line
  ctx.beginPath();
  ctx.moveTo(cx + 4, cy - 2);
  ctx.lineTo(cx + 4, cy + 8);
  ctx.stroke();

  // Note head
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx + 2, cy + 7, 4, 3, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Second note (offset)
  ctx.beginPath();
  ctx.moveTo(cx + 11, cy - 5);
  ctx.lineTo(cx + 11, cy + 5);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx + 9, cy + 4, 4, 3, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Beam connecting the two stems
  ctx.beginPath();
  ctx.moveTo(cx + 4, cy - 2);
  ctx.lineTo(cx + 11, cy - 5);
  ctx.stroke();
}

function drawSpeaker(ctx, cx, cy, active) {
  const color = active ? "#80d0f0" : "#6a7a8a";
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Speaker body (trapezoid)
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy - 5);
  ctx.lineTo(cx - 6, cy + 5);
  ctx.lineTo(cx - 1, cy + 5);
  ctx.lineTo(cx + 4, cy + 9);
  ctx.lineTo(cx + 4, cy - 9);
  ctx.lineTo(cx - 1, cy - 5);
  ctx.closePath();
  ctx.fill();

  // Sound waves
  ctx.beginPath();
  ctx.arc(cx + 7, cy, 4, -0.7, 0.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + 10, cy, 6, -0.7, 0.7);
  ctx.stroke();

  // X overlay if muted
  if (!active) {
    ctx.strokeStyle = "#ff6b6b";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx + 6, cy - 7);
    ctx.lineTo(cx + 14, cy + 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 14, cy - 7);
    ctx.lineTo(cx + 6, cy + 4);
    ctx.stroke();
  }
}

function createMuteButtonTexture(scene, key, icon, active) {
  if (scene.textures.exists(key)) return;

  const tex = scene.textures.createCanvas(key, BTN_SIZE, BTN_SIZE);
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, BTN_SIZE, BTN_SIZE);

  // Background panel
  const bg = active
    ? ctx.createLinearGradient(0, 0, 0, BTN_SIZE)
    : ctx.createLinearGradient(0, 0, 0, BTN_SIZE);
  if (active) {
    bg.addColorStop(0, "rgba(30, 38, 48, 0.98)");
    bg.addColorStop(1, "rgba(16, 22, 30, 0.98)");
  } else {
    bg.addColorStop(0, "rgba(20, 26, 34, 0.98)");
    bg.addColorStop(1, "rgba(10, 14, 20, 0.98)");
  }
  ctx.fillStyle = bg;
  roundedRectPath(ctx, 1, 1, BTN_SIZE - 2, BTN_SIZE - 2, BTN_RADIUS);
  ctx.fill();

  // Border
  ctx.strokeStyle = active
    ? "rgba(255, 200, 100, 0.85)"
    : "rgba(60, 74, 88, 0.80)";
  ctx.lineWidth = 1.8;
  roundedRectPath(ctx, 2, 2, BTN_SIZE - 4, BTN_SIZE - 4, BTN_RADIUS - 1);
  ctx.stroke();

  // Draw icon
  if (icon === "music") {
    drawMusicNote(ctx, 10, 14, active);
  } else {
    drawSpeaker(ctx, 10, 14, active);
  }

  tex.refresh();
}

export function ensureMuteButtonTextures(scene) {
  if (!scene?.textures) return MUTE_BTN_TEXTURES;
  createMuteButtonTexture(scene, MUTE_BTN_TEXTURES.musicOn, "music", true);
  createMuteButtonTexture(scene, MUTE_BTN_TEXTURES.musicOff, "music", false);
  createMuteButtonTexture(scene, MUTE_BTN_TEXTURES.sfxOn, "sfx", true);
  createMuteButtonTexture(scene, MUTE_BTN_TEXTURES.sfxOff, "sfx", false);
  return MUTE_BTN_TEXTURES;
}

// ─── UIMuteToggle class ───────────────────────────────────────────────────

export class UIMuteToggle {
  constructor(scene, soundSystem, x = 20, y = 20) {
    this.scene = scene;
    this.soundSystem = soundSystem;
    this.x = x;
    this.y = y;

    this._toast = null;
    this._toastTween = null;
    this._destroyed = false;

    // Ensure textures exist (safe to call multiple times)
    ensureMuteButtonTextures(scene);

    this.createUI();
  }

  createUI() {
    // Container anchored at (x, y) — left button center at (0,0), right at (56,0)
    this.container = this.scene.add.container(this.x, this.y);
    this.container.setScrollFactor(0);
    this.container.setDepth(2000);

    // --- Music button (left) — generated in-engine texture ---
    this._musicImg = this.scene.add.image(-20, -20, MUTE_BTN_TEXTURES.musicOn)
      .setOrigin(0, 0);
    this.container.add(this._musicImg);

    // --- SFX button (right) — generated in-engine texture ---
    this._sfxImg = this.scene.add.image(26, -20, MUTE_BTN_TEXTURES.sfxOn)
      .setOrigin(0, 0);
    this.container.add(this._sfxImg);

    // --- Interactivity (hit zones) ---
    this._musicHit = this.scene.add.rectangle(0, 0, 40, 40, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    this.container.add(this._musicHit);

    this._musicHit.on('pointerdown', () => {
      if (this._destroyed || !this.soundSystem) return;
      this.scene.tweens.add({ targets: this._musicImg, scaleX: this._musicImg.scaleX * 0.85, scaleY: this._musicImg.scaleY * 0.85, duration: 60, yoyo: true, ease: 'Power2.out' });
      USER_SETTINGS.updateAudio({ musicEnabled: !this.soundSystem.musicEnabled });
      USER_SETTINGS.applyAudioTo(this.soundSystem);
      this.syncMusicState(this.soundSystem.musicEnabled);
      this.showToast(
        this.soundSystem.musicEnabled ? "Music: ON" : "Music: OFF",
        this.soundSystem.musicEnabled ? "#f2f5f8" : "#ff6b6b"
      );
      this.scene.soundSystem.playUiSelect();
    });
    this._musicHit.on('pointerover', () => { if (!this._destroyed) this._musicImg.setAlpha(0.8); });
    this._musicHit.on('pointerout', () => { if (!this._destroyed) this._musicImg.setAlpha(1); });

    this._sfxHit = this.scene.add.rectangle(46, 0, 40, 40, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    this.container.add(this._sfxHit);

    this._sfxHit.on('pointerdown', () => {
      if (this._destroyed || !this.soundSystem) return;
      this.scene.tweens.add({ targets: this._sfxImg, scaleX: this._sfxImg.scaleX * 0.85, scaleY: this._sfxImg.scaleY * 0.85, duration: 60, yoyo: true, ease: 'Power2.out' });
      USER_SETTINGS.updateAudio({ sfxEnabled: !this.soundSystem.sfxEnabled });
      USER_SETTINGS.applyAudioTo(this.soundSystem);
      this.syncSfxState(this.soundSystem.sfxEnabled);
      this.showToast(
        this.soundSystem.sfxEnabled ? "SFX: ON" : "SFX: OFF",
        this.soundSystem.sfxEnabled ? "#f2f5f8" : "#ff6b6b"
      );
      this.scene.soundSystem.playUiSelect();
    });
    this._sfxHit.on('pointerover', () => { if (!this._destroyed) this._sfxImg.setAlpha(0.8); });
    this._sfxHit.on('pointerout', () => { if (!this._destroyed) this._sfxImg.setAlpha(1); });

    // Reflect actual initial state
    this.syncMusicState(this.soundSystem.musicEnabled);
    this.syncSfxState(this.soundSystem.sfxEnabled);
  }

  // ─── Public sync methods (called by GameInputHandler after keypress) ───

  syncMusicState(enabled) {
    if (this._destroyed) return;
    this._updateButtonState(this._musicImg, enabled);
  }

  syncSfxState(enabled) {
    if (this._destroyed) return;
    this._updateButtonState(this._sfxImg, enabled);
  }

  // ─── Toast notification (keyboard feedback only) ───

  showToast(message, color) {
    if (this._destroyed || !this.scene) return;
    if (this.scene.uiNotifications) {
      this.scene.uiNotifications.show(message, {
        color,
        durationMs: 1400,
        key: "audio",
      });
      return;
    }

    // Kill any existing toast immediately
    if (this._toastTween) {
      this._toastTween.stop();
      this._toastTween = null;
    }
    if (this._toast) {
      this._toast.destroy();
      this._toast = null;
    }
    if (this._toastBg) {
      this._toastBg.destroy();
      this._toastBg = null;
    }

    const cx = this.scene.config?.viewportWidth
      ? this.scene.config.viewportWidth / 2
      : this.scene.scale.width / 2;

    this._toast = this.scene.add.text(cx, 55, message, {
      fontFamily: "Consolas, monospace",
      fontSize: "18px",
      fontStyle: "bold",
      color: color,
      stroke: "#000000",
      strokeThickness: 3
    });
    this._toast.setOrigin(0.5);
    this._toast.setScrollFactor(0);
    this._toast.setDepth(2100);
    this._toast.setAlpha(1);

    // Background pill behind toast text
    this._toastBg = this.scene.add.rectangle(cx, 55, this._toast.width + 24, 32, 0x000000, 0.65);
    this._toastBg.setOrigin(0.5);
    this._toastBg.setScrollFactor(0);
    this._toastBg.setDepth(2099);

    this._toastTween = this.scene.tweens.add({
      targets: [this._toast, this._toastBg],
      alpha: 0,
      delay: 400,
      duration: 800,
      ease: "Power2.in",
      onComplete: () => {
        if (this._destroyed) return;
        if (this._toast) { this._toast.destroy(); this._toast = null; }
        if (this._toastBg) { this._toastBg.destroy(); this._toastBg = null; }
        this._toastTween = null;
      }
    });
  }

  // ─── Private helper ───

  _updateButtonState(img, enabled) {
    if (this._destroyed || !img?.texture) return;
    // We now use separate full textures for ON/OFF states rather than
    // a side-by-side sprite sheet. Determine which texture key to use.
    const texKey = img.texture.key;
    let newKey;
    if (texKey.startsWith(MUTE_BTN_TEXTURES.musicOn) || texKey.startsWith(MUTE_BTN_TEXTURES.musicOff)) {
      newKey = enabled ? MUTE_BTN_TEXTURES.musicOn : MUTE_BTN_TEXTURES.musicOff;
    } else {
      newKey = enabled ? MUTE_BTN_TEXTURES.sfxOn : MUTE_BTN_TEXTURES.sfxOff;
    }
    if (texKey !== newKey) {
      img.setTexture(newKey);
    }
    // Ensure uniform scale (40×40 source rendered at native size)
    img.setScale(1);
    img.setCrop();
  }

  // ─── Public API (unchanged) ───

  setPosition(x, y) {
    if (this._destroyed || !this.container) return;
    this.x = x;
    this.y = y;
    this.container.setPosition(x, y);
  }

  setVisible(visible) {
    if (this._destroyed || !this.container) return;
    this.container.setVisible(visible);
    if (this._toast) this._toast.setVisible(visible);
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this._musicHit?.removeAllListeners?.();
    this._sfxHit?.removeAllListeners?.();
    this.scene?.tweens?.killTweensOf?.([this._toast, this._toastBg, this._musicImg, this._sfxImg]);
    if (this._toastTween) {
      this._toastTween.stop();
      this._toastTween = null;
    }
    if (this._toast) { this._toast.destroy(); this._toast = null; }
    if (this._toastBg) { this._toastBg.destroy(); this._toastBg = null; }
    this.container?.destroy();
    this.container = null;
    this._musicHit = null;
    this._sfxHit = null;
    this._musicImg = null;
    this._sfxImg = null;
    this.scene = null;
    this.soundSystem = null;
  }
}
