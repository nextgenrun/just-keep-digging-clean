import { ASSET_KEYS } from "../../values/assetKeys.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { createButton } from "../PhaserUiKit.js";
import { createSettingsPanelContent } from "../overlays/SettingsPanelContent.js";
import { addMenuBackground, getSelectedMenuBackgroundKey } from "../components/LoadingScreenView.js";

const COL = {
  bg:        UI_COLORS.bg,
  cardBase:  UI_COLORS.cardBase,
  cardHover: UI_COLORS.cardHover,
  borderDim: UI_COLORS.borderDim,
  borderHov: UI_COLORS.borderHov,
  title:     UI_COLORS.title,
  dim:       '#4a5a6a',
  hint:      '#5a7a8a',
  version:   '#2a3a4a',
  white:     UI_COLORS.white,
  body:      UI_COLORS.body,
};

const BTN_W      = 260;
const BTN_H      = 52;
const BTN_GAP    = 14;
const BTN_X      = 640;
const BTN_FIRST_Y = 330;

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenuScene");
    this._menuIndex = 0;
    this._btnRefs   = [];
    this._fadeInObjs = [];
    this._overlay   = null;
  }

  create() {
    this.ensureMenuAudioScene();

    const W = this.scale.width;
    const H = this.scale.height;

    // ── Background ──────────────────────────────────────────────────────────
    this.add.rectangle(W / 2, H / 2, W, H, COL.bg);

    addMenuBackground(this, {
      width: W,
      height: H,
      key: getSelectedMenuBackgroundKey(),
      alpha: 0.26,
    });

    // Vignette overlay
    const vignette = this.add.graphics();
    vignette.fillStyle(0x000000, 0.30);
    vignette.fillRect(0, 0, W, H);

    // ── Logo ────────────────────────────────────────────────────────────────
    const logo = this.add.image(W / 2, 150, ASSET_KEYS.branding.logo);
    const logoScale = Math.min(560 / logo.width, 185 / logo.height);
    logo.setScale(logoScale).setAlpha(0);
    this._fadeInObjs.push(logo);

    // Float animation — starts after fade-in completes
    this.tweens.add({
      targets:  logo,
      y:        logo.y - 6,
      yoyo:     true,
      repeat:   -1,
      duration: 2200,
      ease:     'Sine.easeInOut',
      delay:    320,
    });

    // ── Separator + tagline ─────────────────────────────────────────────────
    const sep1 = this.add.graphics();
    sep1.lineStyle(1, 0x3a4f62, 0.8);
    sep1.lineBetween(220, 238, W - 220, 238);
    sep1.setAlpha(0);
    this._fadeInObjs.push(sep1);

    const tagline = this.add.text(W / 2, 266, 'dig deep.  grow stronger.  keep going.', {
      fontFamily: 'Consolas, monospace',
      fontSize:   '14px',
      color:      COL.hint,
      letterSpacing: 1,
    }).setOrigin(0.5).setAlpha(0);
    this._fadeInObjs.push(tagline);

    // ── Buttons ─────────────────────────────────────────────────────────────
    const BUTTONS = [
      { label: 'PLAY',     action: () => this.scene.start('StartMenuScene') },
      { label: 'SETTINGS', action: () => this._showSettings() },
      { label: 'CREDITS',  action: () => this._showCredits() },
    ];

    this._btnRefs = BUTTONS.map((btn, i) => {
      const y = BTN_FIRST_Y + i * (BTN_H + BTN_GAP);
      return this._buildButton(BTN_X, y, btn.label, btn.action);
    });

    // Keyboard cursor — thin accent bar on the left of buttons
    this._cursor = this.add.rectangle(
      BTN_X - BTN_W / 2 - 8, BTN_FIRST_Y, 3, Math.round(BTN_H * 0.65), 0xffffff
    );
    this._cursor.setAlpha(0);
    this._fadeInObjs.push(this._cursor);

    // ── Bottom bar ───────────────────────────────────────────────────────────
    const sep2 = this.add.graphics();
    sep2.lineStyle(1, 0x2a3a4a, 0.8);
    sep2.lineBetween(80, H - 80, W - 80, H - 80);
    sep2.setAlpha(0);
    this._fadeInObjs.push(sep2);

    const hintBar = this.add.text(W / 2, H - 54, '↑ ↓ — navigate     ENTER — select     ESC — back', {
      fontFamily: 'Consolas, monospace',
      fontSize:   '13px',
      color:      COL.hint,
    }).setOrigin(0.5).setAlpha(0);
    this._fadeInObjs.push(hintBar);

    this.add.text(W - 14, H - 10, 'v0.1-alpha', {
      fontFamily: 'Consolas, monospace',
      fontSize:   '11px',
      color:      COL.version,
    }).setOrigin(1, 1);

    // ── Fade everything in ───────────────────────────────────────────────────
    this._fadeInObjs.forEach(obj => {
      this.tweens.add({ targets: obj, alpha: 1, duration: 280, ease: 'Power1.out', delay: 80 });
    });

    // Init keyboard highlight
    this._menuIndex = 0;
    this._updateKeyboardHighlight();
    this._setupInput();

    this.events.once('shutdown', () => this.input.keyboard.removeAllListeners());
  }

  ensureMenuAudioScene() {
    if (!this.scene.isActive("MenuAudioScene")) {
      this.scene.launch("MenuAudioScene");
    }
    this.scene.get("MenuAudioScene")?.attachTo?.(this);
  }

  // ─── Button builder ──────────────────────────────────────────────────────

  _buildButton(x, y, label, action) {
    // Drawn background (Graphics)
    const bg = this.add.graphics();
    bg.lineStyle(1, COL.borderDim, 1);
    bg.fillStyle(COL.cardBase, 1);
    bg.fillRoundedRect(x - BTN_W / 2, y - BTN_H / 2, BTN_W, BTN_H, 6);
    bg.strokeRoundedRect(x - BTN_W / 2, y - BTN_H / 2, BTN_W, BTN_H, 6);
    bg.setAlpha(0);
    this._fadeInObjs.push(bg);

    // Hover colour layer — Graphics with rounded corners matching bg
    const hoverLayer = this.add.graphics().setAlpha(0);
    hoverLayer.fillStyle(COL.cardHover, 1);
    hoverLayer.fillRoundedRect(x - BTN_W / 2, y - BTN_H / 2, BTN_W, BTN_H, 6);
    this._fadeInObjs.push(hoverLayer);

    // Label
    const text = this.add.text(x, y, label, {
      fontFamily:    'Consolas, monospace',
      fontSize:      '16px',
      fontStyle:     'bold',
      color:         COL.white,
      letterSpacing: 3,
    }).setOrigin(0.5).setAlpha(0);
    this._fadeInObjs.push(text);

    // Invisible hit zone
    const hit = this.add.rectangle(x, y, BTN_W, BTN_H, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);
    this._fadeInObjs.push(hit);

    hit.on('pointerover', () => {
      this.soundSystem?.playUiSelect?.();
      this.tweens.killTweensOf(hoverLayer);
      this.tweens.add({ targets: hoverLayer, alpha: 0.55, duration: 90, ease: 'Power1.out' });
    });
    hit.on('pointerout', () => {
      this.tweens.killTweensOf(hoverLayer);
      this.tweens.add({ targets: hoverLayer, alpha: 0, duration: 90, ease: 'Power1.out' });
    });
    hit.on('pointerdown', () => {
      this.tweens.add({
        targets:  [hoverLayer, text],
        scaleX:   0.97,
        scaleY:   0.97,
        duration: 55,
        ease:     'Power2.in',
        yoyo:     true,
        onComplete: () => {
          this.soundSystem?.playUiConfirm?.();
          action();
        },
      });
    });

    return { bg, hoverLayer, text, hit, y };
  }

  // ─── Keyboard highlight ──────────────────────────────────────────────────

  _updateKeyboardHighlight() {
    const targetY = BTN_FIRST_Y + this._menuIndex * (BTN_H + BTN_GAP);
    this.tweens.killTweensOf(this._cursor);
    this.tweens.add({
      targets:  this._cursor,
      y:        targetY,
      alpha:    0.85,
      duration: 130,
      ease:     'Power2.out',
    });
    this._btnRefs.forEach((r, i) => {
      this.tweens.killTweensOf(r.hoverLayer);
      this.tweens.add({
        targets:  r.hoverLayer,
        alpha:    i === this._menuIndex ? 0.38 : 0,
        duration: 90,
        ease:     'Power1.out',
      });
    });
  }

  // ─── Input ───────────────────────────────────────────────────────────────

  _setupInput() {
    const N = this._btnRefs.length;
    this.input.keyboard.on('keydown-DOWN', () => {
      if (this._overlay) return;
      this._menuIndex = (this._menuIndex + 1) % N;
      this.soundSystem?.playUiSelect?.();
      this._updateKeyboardHighlight();
    });
    this.input.keyboard.on('keydown-UP', () => {
      if (this._overlay) return;
      this._menuIndex = (this._menuIndex - 1 + N) % N;
      this.soundSystem?.playUiSelect?.();
      this._updateKeyboardHighlight();
    });
    this.input.keyboard.on('keydown-ENTER', () => {
      if (this._overlay) return;
      this._btnRefs[this._menuIndex]?.hit.emit('pointerdown');
    });
    this.input.keyboard.on('keydown-ESC', () => {
      if (this._overlay) this._closeOverlay();
    });
  }

  // ─── Overlay helpers ─────────────────────────────────────────────────────

  _createOverlayBase(title, options = {}) {
    const W = this.scale.width;
    const H = this.scale.height;
    const PW = options.width || 600;
    const PH = options.height || 360;
    const cx = W / 2, cy = H / 2;

    const shade = this.add.rectangle(cx, cy, W, H, 0x000000, 0).setDepth(100);

    const panel = this.add.graphics().setDepth(101).setAlpha(0);
    panel.lineStyle(2, COL.borderHov, 1);
    panel.fillStyle(0x0d1117, 1);
    panel.fillRoundedRect(cx - PW / 2, cy - PH / 2, PW, PH, 8);
    panel.strokeRoundedRect(cx - PW / 2, cy - PH / 2, PW, PH, 8);

    const titleText = this.add.text(cx, cy - PH / 2 + 36, title, {
      fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
      fontSize:   '22px',
      fontStyle:  'bold',
      color:      COL.title,
      letterSpacing: 2,
    }).setOrigin(0.5).setDepth(102).setAlpha(0);

    const sep = this.add.graphics().setDepth(102).setAlpha(0);
    sep.lineStyle(1, COL.borderDim, 0.8);
    sep.lineBetween(cx - PW / 2 + 30, cy - PH / 2 + 62, cx + PW / 2 - 30, cy - PH / 2 + 62);

    const closeHint = this.add.text(cx, cy + PH / 2 - 24, 'ESC — close', {
      fontFamily: 'Consolas, monospace',
      fontSize:   '13px',
      color:      COL.hint,
    }).setOrigin(0.5).setDepth(102).setAlpha(0);

    const closeBtn = createButton(this, {
      x: cx + PW / 2 - 70,
      y: cy - PH / 2 + 38,
      width: 104,
      height: 32,
      label: 'CLOSE',
      hint: 'ESC',
      accent: COL.borderHov,
      depth: 103,
      fontSize: '10px',
      onClick: () => this._closeOverlay(),
    });
    closeBtn.root.setAlpha(0);

    this.tweens.add({ targets: shade, alpha: 0.6, duration: 160, ease: 'Power1.out' });
    this.tweens.add({
      targets:  [panel, titleText, sep, closeHint, closeBtn.root],
      alpha:    1,
      duration: 200,
      delay:    30,
      ease:     'Power1.out',
    });

    return { shade, panel, titleText, sep, closeHint, closeBtn, cx, cy, PW, PH };
  }

  _closeOverlay() {
    if (!this._overlay) return;
    const objs = this._overlay.objs;
    const destroyObjs = this._overlay.destroyObjs || objs;
    const destroyers = this._overlay.destroyers || [];
    this.tweens.add({
      targets:    objs,
      alpha:      0,
      duration:   160,
      ease:       'Power1.in',
      onComplete: () => {
        destroyers.forEach(destroy => {
          try { destroy?.(); } catch (_) {}
        });
        destroyObjs.forEach(o => o.destroy());
      },
    });
    this._overlay = null;
  }

  // ─── Settings overlay ────────────────────────────────────────────────────

  _showSettings() {
    if (this._overlay) return;
    const W = this.scale.width;
    const H = this.scale.height;
    const panelWidth = Math.min(W - 120, 860);
    const panelHeight = Math.min(H - 120, 640);
    const settingsWidth = Math.min(panelWidth - 120, 760);
    const settingsHeight = Math.min(panelHeight - 190, 430);
    const compact = settingsWidth < 700;
    const base = this._createOverlayBase('SETTINGS', { width: panelWidth, height: panelHeight });
    const { cx, cy } = base;
    const settingsContent = createSettingsPanelContent(this, {
      x: cx,
      y: cy + 42,
      width: settingsWidth,
      height: settingsHeight,
      depth: 103,
      manageFocus: true,
      compact,
      onCancel: () => this._closeOverlay(),
    });
    settingsContent.root.setAlpha(0);

    this.tweens.add({ targets: settingsContent.root, alpha: 1, duration: 200, delay: 50, ease: 'Power1.out' });

    this._overlay = {
      objs: [base.shade, base.panel, base.titleText, base.sep, base.closeHint, base.closeBtn.root, settingsContent.root],
      destroyObjs: [base.shade, base.panel, base.titleText, base.sep, base.closeHint, base.closeBtn.root],
      destroyers: [() => settingsContent.destroy()],
    };
  }

  // ─── Credits overlay ─────────────────────────────────────────────────────

  _showCredits() {
    if (this._overlay) return;
    const base = this._createOverlayBase('CREDITS');
    const { cx, cy, PH } = base;

    const body = this.add.text(cx, cy - PH / 2 + 88, [
      'Just Keep Digging',
      '',
      'Game Design & Development',
      'Solo Project',
      '',
      'Built with Phaser 3',
      '',
      'v0.1-alpha',
    ].join('\n'), {
      fontFamily:  'Consolas, monospace',
      fontSize:    '15px',
      color:       COL.body,
      lineSpacing: 8,
      align:       'center',
    }).setOrigin(0.5, 0).setDepth(102).setAlpha(0);

    this.tweens.add({ targets: body, alpha: 1, duration: 200, delay: 50, ease: 'Power1.out' });

    this._overlay = { objs: [base.shade, base.panel, base.titleText, base.sep, base.closeHint, base.closeBtn.root, body] };
  }
}
