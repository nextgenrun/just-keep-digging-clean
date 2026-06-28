import { ASSET_KEYS } from "../../values/assetKeys.js";
import { USER_SETTINGS } from "../../systems/UserSettings.js";

export class UIMuteToggle {
  constructor(scene, soundSystem, x = 20, y = 20) {
    this.scene = scene;
    this.soundSystem = soundSystem;
    this.x = x;
    this.y = y;

    this._toast = null;
    this._toastTween = null;
    this._destroyed = false;

    this.createUI();
  }

  createUI() {
    // Container anchored at (x, y) — left button center at (0,0), right at (56,0)
    this.container = this.scene.add.container(this.x, this.y);
    this.container.setScrollFactor(0);
    this.container.setDepth(2000);

    // --- Music button (left) — stone-art sprite with ON/OFF states side by side ---
    // Using origin (0,0) to prevent position shift when cropping between states
    this._musicImg = this.scene.add.image(-20, -20, ASSET_KEYS.ui.btnMusicStates)
      .setOrigin(0, 0);
    this.container.add(this._musicImg);

    // --- SFX button (right) — stone-art sprite with ON/OFF states side by side ---
    // Position accounts for 40px button width + 6px gap = 46px from center of first button
    this._sfxImg = this.scene.add.image(26, -20, ASSET_KEYS.ui.btnSfxStates)
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
    // Sprite has ON state (left half) and OFF/muted state (right half) side by side
    // Scale so one state half exactly fills the 40×40 button area
    const src = img.texture.getSourceImage();
    const stateW = src.width / 2;
    const th = src.height;
    const scale = 40 / stateW;
    img.setScale(scale, 40 / th);
    
    // Store base position if not set
    if (img._baseX === undefined) {
      img._baseX = img.x;
    }
    
    if (enabled) {
      // ON state: crop left half, no position adjustment needed
      img.setCrop(0, 0, stateW, th);
      img.x = img._baseX;
    } else {
      // OFF state: crop right half, shift left to compensate for crop offset
      img.setCrop(stateW, 0, stateW, th);
      // Shift left by the scaled state width to keep visual position consistent
      img.x = img._baseX - (stateW * scale);
    }
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
