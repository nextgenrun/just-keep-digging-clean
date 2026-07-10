import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { COMBO_CONFIG } from "../../values/comboConfig.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { LIGHT_CONFIG } from "../../values/lightConfig.js";
import { USER_SETTINGS } from "../UserSettings.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { HUD_JUICE_CONFIG } from "../../values/hudJuiceConfig.js";

const WEATHER_ICONS = Object.freeze({
  clear: "☀️",
  drizzle: "🌦",
  rain: "🌧",
  storm: "⛈",
});

const SEASON_ICONS = Object.freeze({
  spring: "🌸",
  summer: "☀️",
  autumn: "🍂",
  winter: "❄️",
});

function setTextIfChanged(textObject, value) {
  if (textObject?.text !== value) textObject?.setText(value);
}

const HUD_TORCH_TEXTURE_KEYS = Object.freeze({
  off: "_hud_torch_off_v2",
  on: "_hud_torch_on_v2",
});

const HUD_TORCH_TEXTURE_SIZE = 72;

function ensureHudTorchTextures(scene) {
  if (!scene?.textures) return HUD_TORCH_TEXTURE_KEYS;

  const size = HUD_TORCH_TEXTURE_SIZE;
  const makeTorchTexture = (key, active) => {
    if (scene.textures.exists(key)) return;

    const texture = scene.textures.createCanvas(key, size, size);
    const ctx = texture.getContext();
    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = active ? "#2b1a12" : "#1d2126";
    ctx.fillRect(4, 4, size - 8, size - 8);

    ctx.fillStyle = active ? "#3f2c20" : "#31363f";
    ctx.fillRect(size * 0.32, size * 0.34, size * 0.14, size * 0.28);

    ctx.fillStyle = active ? "#f8b45b" : "#6f7a86";
    ctx.beginPath();
    ctx.moveTo(size * 0.4, size * 0.22);
    ctx.bezierCurveTo(size * 0.29, size * 0.35, size * 0.31, size * 0.61, size * 0.43, size * 0.67);
    ctx.bezierCurveTo(size * 0.55, size * 0.58, size * 0.51, size * 0.41, size * 0.59, size * 0.3);
    ctx.bezierCurveTo(size * 0.63, size * 0.24, size * 0.61, size * 0.18, size * 0.5, size * 0.2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = active ? "#ffe7a8" : "#9da7b4";
    ctx.fillRect(size * 0.26, size * 0.47, size * 0.31, size * 0.04);
    texture.refresh();
  };

  makeTorchTexture(HUD_TORCH_TEXTURE_KEYS.off, false);
  makeTorchTexture(HUD_TORCH_TEXTURE_KEYS.on, true);
  return HUD_TORCH_TEXTURE_KEYS;
}

export class HUDSystem {
  constructor(scene, maxXTile, refreshIntervalMs = 90) {
    this.scene = scene;
    this.maxXTile = maxXTile;
    this.refreshIntervalMs = refreshIntervalMs;

    this.depth = 0;
    this._displayedDepth = 0;      // tweened depth for count-up display
    this._depthTween = null;
    this.xTile = 0;
    this.tilesBroken = 0;
    this.aim = "RIGHT";
    this.gemPowerPercent = 0;
    this.gemPowerRaw = 0;
    this.gemPowerMax = 0;
    this.torchActive = false;
    this.torchDrainGpPerSecond = LIGHT_CONFIG.torchDrainGpPerSecond;
    this._destroyed = false;

    // Combo pop state
    this._lastComboCount = 0;
    this._comboPopTween = null;

    this.statsDirty = true;
    this.lastRefreshMs = 0;
    
    this.comboSystem = null;
    this.comboVisible = false;

    this.colors = {
      primary: UI_COLORS.white,
      secondary: UI_COLORS.body,
      success: UI_COLORS.success,
      danger: UI_COLORS.danger,
      warning: "#ffaa00",
      info: "#44aaff",
      gold: "#ffd700",
      purple: "#aa88ff",
    };

    this.hudBg = scene.add
      .rectangle(0, 0, HUD_LAYOUT.hudPanelW, HUD_LAYOUT.hudPanelH, UI_COLORS.bg, 0.72)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudDepth - 1);
    this.hudBg.setStrokeStyle(1, UI_COLORS.borderDim, 0.9);

    this.statsText = scene.add
      .text(HUD_LAYOUT.statsX, HUD_LAYOUT.statsY, "", {
        fontFamily: "Consolas, monospace",
        fontSize: HUD_LAYOUT.statsFontSize,
        color: this.colors.primary,
        lineSpacing: HUD_LAYOUT.statsLineSpacing,
      })
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudDepth);

    this.statusBg = scene.add
      .rectangle(
        HUD_LAYOUT.statusX - 6, HUD_LAYOUT.statusY,
        10, 28,
        UI_COLORS.bg, 0.72
      )
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudDepth - 1)
      .setVisible(false);
    this.statusBg.setStrokeStyle(1, UI_COLORS.borderDim, 0.85);

    this.statusText = scene.add
      .text(HUD_LAYOUT.statusX, HUD_LAYOUT.statusY, "", {
        fontFamily: "Consolas, monospace",
        fontSize: HUD_LAYOUT.statusFontSize,
        color: this.colors.warning,
      })
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudDepth);

    this.statusUntil = 0;

    this.flyHintText = scene.add
      .text(HUD_LAYOUT.flyHintX, HUD_LAYOUT.flyHintY, "SHIFT: FLY  (0/3 tiles)", {
        fontFamily: "Consolas, monospace",
        fontSize: HUD_LAYOUT.flyHintFontSize,
        color: this.colors.purple,
      })
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudOverlayDepth)
      .setVisible(false);

    this.dashCooldownText = scene.add
      .text(HUD_LAYOUT.dashCooldownX, HUD_LAYOUT.dashCooldownY, "", {
        fontFamily: "Consolas, monospace",
        fontSize: HUD_LAYOUT.dashCooldownFontSize,
        color: this.colors.purple,
      })
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudOverlayDepth)
      .setVisible(false);

    this.torchTextures = ensureHudTorchTextures(scene);
    this.torchIcon = scene.add
      .image(HUD_LAYOUT.torchIconX ?? HUD_LAYOUT.torchLabelX, HUD_LAYOUT.torchIconY ?? (HUD_LAYOUT.torchLabelY - 6), this.torchTextures.off)
      .setOrigin(0, 0)
      .setDisplaySize(HUD_LAYOUT.torchIconW ?? 34, HUD_LAYOUT.torchIconH ?? 34)
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudOverlayDepth);

    this.torchStatusText = scene.add
      .text(HUD_LAYOUT.torchLabelTextX ?? HUD_LAYOUT.torchLabelX, HUD_LAYOUT.torchLabelY, `TORCH [${USER_SETTINGS.getKeyLabel("torch")}]: OFF`, {
        fontFamily: "Consolas, monospace",
        fontSize: HUD_LAYOUT.torchLabelFontSize,
        color: HUD_LAYOUT.torchLabelOffColor,
      })
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudOverlayDepth);

    this.specialBlockEffectsManager = null;
    this.buffTimerText = scene.add
      .text(HUD_LAYOUT.buffTimerX, HUD_LAYOUT.buffTimerY, "", {
        fontFamily: "Consolas, monospace",
        fontSize: HUD_LAYOUT.buffTimerFontSize,
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: HUD_LAYOUT.buffTimerStrokeThickness,
      })
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudOverlayDepth)
      .setVisible(false);

    this.comboText = scene.add
        .text(HUD_LAYOUT.comboBarX, HUD_LAYOUT.comboBarY, "", {
          fontFamily: "Consolas, monospace",
          fontSize: HUD_LAYOUT.comboFontSize,
          color: HUD_LAYOUT.comboFontColor,
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 4
        })
        .setScrollFactor(0)
        .setDepth(HUD_LAYOUT.hudOverlayDepth)
        .setVisible(false);

    this.comboTimerBg = scene.add
      .graphics()
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudOverlayDepth)
      .setVisible(false);

    this.comboTimerBar = scene.add
        .graphics()
        .setScrollFactor(0)
        .setDepth(HUD_LAYOUT.hudOverlayDepth)
        .setVisible(false);

    this.progressBarBg = scene.add
      .graphics()
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudOverlayDepth)
      .setVisible(false);

    this.progressBar = scene.add
      .graphics()
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudOverlayDepth)
      .setVisible(false);

    this.progressBarText = scene.add
      .text(0, 0, "", {
        fontFamily: "Consolas, monospace",
        fontSize: "14px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudOverlayDepth)
      .setVisible(false);

    this.progressBarUntil = 0;

    const vw = this.scene.scale?.width || 1280;
    this.clockPanelX = vw - HUD_LAYOUT.clockPanelW - 12;

    this.clockPanel = scene.add
      .rectangle(this.clockPanelX, HUD_LAYOUT.clockY, HUD_LAYOUT.clockPanelW, HUD_LAYOUT.clockPanelH, UI_COLORS.bg, 0.62)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudDepth - 1);
    this.clockPanel.setStrokeStyle(1, UI_COLORS.borderDim, 0.78);

    this.clockTimeText = scene.add
      .text(this.clockPanelX + 10, HUD_LAYOUT.clockY + 8, "00:00 AM", {
        fontFamily: "Consolas, monospace",
        fontSize: HUD_LAYOUT.clockFontSize,
        color: HUD_LAYOUT.clockColor,
      })
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudDepth);

    this.clockDayText = scene.add
      .text(this.clockPanelX + 10, HUD_LAYOUT.clockY + 32, "Day 1 — Afternoon", {
        fontFamily: "Consolas, monospace",
        fontSize: HUD_LAYOUT.clockDayFontSize,
        color: HUD_LAYOUT.clockDayColor,
      })
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudDepth);

    this.weatherPanelX = vw - HUD_LAYOUT.weatherPanelW - 12;
    this.weatherPanel = scene.add
      .rectangle(this.weatherPanelX, HUD_LAYOUT.weatherY, HUD_LAYOUT.weatherPanelW, HUD_LAYOUT.weatherPanelH, UI_COLORS.bg, 0.58)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudDepth - 1);
    this.weatherPanel.setStrokeStyle(1, UI_COLORS.borderDim, 0.72);

    this.weatherText = scene.add
      .text(this.weatherPanelX + 10, HUD_LAYOUT.weatherY + 6, "☀️ Clear", {
        fontFamily: "Consolas, monospace",
        fontSize: HUD_LAYOUT.weatherFontSize,
        color: HUD_LAYOUT.weatherColor,
      })
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudDepth);

    this.weatherTempText = scene.add
      .text(this.weatherPanelX + 10, HUD_LAYOUT.weatherY + 28, "25°C", {
        fontFamily: "Consolas, monospace",
        fontSize: "14px",
        color: HUD_LAYOUT.weatherTempColor,
      })
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudDepth);

    this.weatherSeasonText = scene.add
      .text(this.weatherPanelX + 10, HUD_LAYOUT.weatherY + 50, "🌸 Spring", {
        fontFamily: "Consolas, monospace",
        fontSize: HUD_LAYOUT.seasonFontSize,
        color: HUD_LAYOUT.weatherSeasonColor,
      })
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudDepth);

    this.weatherIntensityBar = scene.add
      .graphics()
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudDepth + 1);

    this._createLootBagTarget();

    this.refresh();
    this.statsDirty = false;
  }

  setComboSystem(comboSystem) {
    this.comboSystem = comboSystem;
  }

  setSpecialBlockEffectsManager(manager) {
    this.specialBlockEffectsManager = manager;
  }

  _createLootBagTarget() {
    const featureFlags = this.scene.config?.featureFlags;
    const lootVisualsEnabled = this.scene.config?.lootVisuals !== false
      && featureFlags?.lootVisuals !== false
      && featureFlags?.["loot-visuals"] !== false;
    const vw = this.scene.scale?.width || 1280;
    const vh = this.scene.scale?.height || 720;
    const x = vw - 42;
    const y = vh - 42;

    this.lootBagContainer = this.scene.add.container(x, y)
      .setScrollFactor(0)
      .setDepth(HUD_LAYOUT.hudOverlayDepth + 4)
      .setVisible(lootVisualsEnabled);

    const bg = this.scene.add.rectangle(0, 0, 50, 50, 0x101820, 0.82);
    bg.setStrokeStyle(2, 0xc9a227, 0.9);
    bg.setOrigin(0.5);

    if (this.scene.textures.exists(ASSET_KEYS.ui.lootBag)) {
      this.lootBagIcon = this.scene.add.image(0, 0, ASSET_KEYS.ui.lootBag)
        .setDisplaySize(46, 46);
    } else {
      this.lootBagIcon = this._createFallbackLootBagGraphic();
    }

    const badgeBg = this.scene.add.rectangle(15, 15, 17, 15, 0xffd98f, 1).setOrigin(0.5);
    badgeBg.setStrokeStyle(1, 0x101820, 0.85);
    this.lootBagBadge = this.scene.add.text(15, 15, "I", {
      fontFamily: "Consolas, monospace",
      fontSize: "12px",
      color: "#101820",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.lootBagContainer.add([bg, this.lootBagIcon, badgeBg, this.lootBagBadge]);
  }

  _createFallbackLootBagGraphic() {
    const bag = this.scene.add.graphics();
    bag.fillStyle(0x8a5a2b, 1);
    bag.fillRoundedRect(-14, -6, 28, 23, 4);
    bag.lineStyle(2, 0xffd98f, 0.9);
    bag.strokeRoundedRect(-14, -6, 28, 23, 4);
    bag.lineStyle(3, 0x5a351b, 1);
    bag.beginPath();
    bag.arc(0, -6, 9, Math.PI, Math.PI * 2);
    bag.strokePath();
    bag.fillStyle(0xffd98f, 1);
    bag.fillRect(-3, 3, 6, 5);
    return bag;
  }

  getLootPickupTarget() {
    if (!this.lootBagContainer) {
      const vw = this.scene.scale?.width || 1280;
      const vh = this.scene.scale?.height || 720;
      return { x: vw - 42, y: vh - 42 };
    }
    return {
      x: this.lootBagContainer.x,
      y: this.lootBagContainer.y,
    };
  }

  pulseLootTarget(_resourceType = null, strong = false) {
    if (!this.lootBagContainer || this._destroyed) return;
    const scale = strong ? 1.24 : 1.14;
    this.scene.tweens.killTweensOf(this.lootBagContainer);
    this.lootBagContainer.setScale(1);
    this.scene.tweens.add({
      targets: this.lootBagContainer,
      scale,
      duration: 90,
      yoyo: true,
      ease: "Back.out",
    });
  }

  setDepth(value) {
    const next = Math.max(0, value);
    if (next !== this.depth) {
      this.depth = next;
      this.statsDirty = true;
      this._startDepthCountUp();
    }
  }

  _startDepthCountUp() {
    if (!HUD_JUICE_CONFIG.enabled || !HUD_JUICE_CONFIG.depthCountUp.enabled) {
      this._displayedDepth = this.depth;
      return;
    }
    const cfg = HUD_JUICE_CONFIG.depthCountUp;
    const prev = this._displayedDepth;

    // Kill any existing depth tween
    if (this._depthTween) {
      this._depthTween.stop();
      this._depthTween = null;
    }

    // Check for 100m milestone flash
    const milestoneEvery = cfg.milestoneEvery;
    if (milestoneEvery > 0 && prev > 0) {
      const prevMilestone = Math.floor(prev / milestoneEvery);
      const newMilestone = Math.floor(this.depth / milestoneEvery);
      if (newMilestone > prevMilestone) {
        this._flashDepthMilestone();
      }
    }

    // Tween the displayed depth
    this._displayedDepth = prev;
    this._depthTween = this.scene.tweens.add({
      targets: this,
      _displayedDepth: this.depth,
      duration: cfg.durationMs,
      ease: cfg.ease,
      onUpdate: () => { this.statsDirty = true; },
      onComplete: () => {
        this._displayedDepth = this.depth;
        this._depthTween = null;
        this.statsDirty = true;
      },
    });
  }

  _flashDepthMilestone() {
    const cfg = HUD_JUICE_CONFIG.depthCountUp;
    if (!this.statsText?.active) return;
    const originalColor = this.colors.primary;
    this.statsText.setColor(cfg.milestoneFlashColor);
    this.scene.tweens.add({
      targets: this.statsText,
      alpha: 0.5,
      duration: cfg.milestoneFlashMs * 0.3,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (this.statsText?.active) {
          this.statsText.setColor(originalColor);
          this.statsText.setAlpha(1);
        }
      },
    });
  }

  setXTile(value) {
    const next = Math.max(0, value);
    if (next !== this.xTile) {
      this.xTile = next;
      this.statsDirty = true;
    }
  }

  setTilesBroken(value) {
    const next = Math.max(0, value);
    if (next !== this.tilesBroken) {
      this.tilesBroken = next;
      this.statsDirty = true;
    }
  }

  setAim(value) {
    if (value !== this.aim) {
      this.aim = value;
      this.statsDirty = true;
    }
  }

  setGemPower(value) {
    const v = Math.max(0, Math.min(100, value));
    if (v !== this.gemPowerPercent) {
      this.gemPowerPercent = v;
      this.statsDirty = true;
    }
  }

  setGemPowerValues(raw, max) {
    if (raw !== this.gemPowerRaw || max !== this.gemPowerMax) {
      this.gemPowerRaw = raw;
      this.gemPowerMax = max;
      this.statsDirty = true;
    }
  }

  setTorchState(active, drainGpPerSecond = LIGHT_CONFIG.torchDrainGpPerSecond) {
    this.torchActive = Boolean(active);
    this.torchDrainGpPerSecond = drainGpPerSecond;
    const torchKey = USER_SETTINGS.getKeyLabel("torch");
    this.torchStatusText?.setText(
      this.torchActive ? `TORCH [${torchKey}]: ON · ${drainGpPerSecond} GP/s` : `TORCH [${torchKey}]: OFF`
    );
    this.torchStatusText?.setColor(
      this.torchActive ? HUD_LAYOUT.torchLabelOnColor : HUD_LAYOUT.torchLabelOffColor
    );
    this.torchIcon?.setTexture(this.torchActive ? this.torchTextures.on : this.torchTextures.off);
    this.torchIcon?.setAlpha(this.torchActive ? 1 : 0.82);
  }

  setFlightHeight(currentHeight, maxHeight) {
    const heightStr = `${currentHeight.toFixed(1)}/${maxHeight} tiles`;
    const flyKey = USER_SETTINGS.getKeyLabel("fly");
    
    if (currentHeight > 0.1) {
      this.flyHintText.setText(`✈️ FLYING  (${heightStr})`);
      this.flyHintText.setColor(this.colors.success);
    } else {
      this.flyHintText.setText(`${flyKey}: FLY  (${heightStr})`);
      this.flyHintText.setColor(this.colors.purple);
    }
  }

  setDashCooldown(remainingMs, unlocked) {
    if (!unlocked) {
      this.dashCooldownText.setVisible(false);
      return;
    }
    this.dashCooldownText.setVisible(true);
    const dashKey = USER_SETTINGS.getKeyLabel("gemDash");
    if (remainingMs <= 0) {
      this.dashCooldownText.setColor(this.colors.purple);
      this.dashCooldownText.setText(`${dashKey}: DASH ready`);
    } else {
      const secs = (remainingMs / 1000).toFixed(1);
      this.dashCooldownText.setColor(this.colors.warning);
      this.dashCooldownText.setText(`DASH: ${secs}s`);
    }
  }

  isDirty() {
    return this.statsDirty;
  }

  flashStatus(message, color = HUD_LAYOUT.flashStatusDefaultColor, durationMs = HUD_LAYOUT.flashStatusDefaultDurationMs) {
    if (this._destroyed || !message) return;

    if (this.scene?.uiNotifications && !this.scene.uiNotifications.destroyed) {
      this.scene.uiNotifications.show(message, {
        color,
        durationMs,
        key: "hud-status",
      });
      return;
    }

    if (!this.statusText?.active || !this.statusBg?.active || !this.scene?.time) return;
    this.statusText.setColor(color);
    this.statusText.setText(message);
    this.statusUntil = this.scene.time.now + durationMs;
    this.scene.time.delayedCall(0, () => {
      if (!this._destroyed && this.statusText?.active && this.statusBg?.active && this.statusText.width > 0) {
        this.statusBg.setSize(this.statusText.width + 14, 28).setVisible(true);
      }
    });
  }

  refreshKeybindHints() {
    if (this._destroyed) return;
    this.setTorchState(this.torchActive, this.torchDrainGpPerSecond);
  }

  update(timeMs) {
    if (this._destroyed) return;
    if (this.statsDirty && (this.lastRefreshMs === 0 || timeMs - this.lastRefreshMs >= this.refreshIntervalMs)) {
      this.refresh();
      this.lastRefreshMs = timeMs;
      this.statsDirty = false;
    }

    if (this.statusText?.text && timeMs >= this.statusUntil) {
      this.statusText.setText("");
      this.statusBg?.setVisible(false);
    }
    
    this.updateCombo(timeMs);

    this.updateBuffTimers();

    this.updateProgressBar(timeMs);

    this.updateClockWeather();
  }

  updateClockWeather() {
    const dnc = this.scene.dayNightCycle;
    const ws = this.scene.weatherSystem;

    if (dnc) {
      setTextIfChanged(this.clockTimeText, dnc.getTimeString12());

      const phaseLabel = dnc.getCurrentPhaseLabel();
      const day = dnc.getDay();
      setTextIfChanged(this.clockDayText, `Day ${day} — ${phaseLabel}`);
    }

    if (ws) {
      const snap = ws.getSnapshot();
      const icon = WEATHER_ICONS[snap.kind] || "☀️";
      const label = snap.kind.charAt(0).toUpperCase() + snap.kind.slice(1);
      const forecast = snap.forecastKind && snap.forecastKind !== snap.kind
        ? ` -> ${snap.forecastKind.charAt(0).toUpperCase() + snap.forecastKind.slice(1)}`
        : "";
      setTextIfChanged(this.weatherText, `${icon} ${label}${forecast}`);

      if (dnc) {
        setTextIfChanged(this.weatherTempText, `${dnc.getCurrentTemperature()}°C`);
      }

      if (dnc) {
        const season = dnc.getSeason();
        setTextIfChanged(this.weatherSeasonText, `${SEASON_ICONS[season] || ""} ${season.charAt(0).toUpperCase() + season.slice(1)}`);
      }

      const intensity = snap.intensity;
      const barW = HUD_LAYOUT.weatherPanelW - 20;
      const barH = 4;
      const barX = this.weatherPanelX + 10;
      const barY = HUD_LAYOUT.weatherY + HUD_LAYOUT.weatherPanelH - 10;

      this.weatherIntensityBar.clear();
      if (intensity > 0.05) {
        this.weatherIntensityBar.fillStyle(0x1a1a2e, 0.6);
        this.weatherIntensityBar.fillRect(barX, barY, barW, barH);
        const fillColor = snap.isStorming ? 0xff4444 : snap.kind === "rain" ? 0x4488ff : 0x88aaff;
        this.weatherIntensityBar.fillStyle(fillColor, 0.8);
        this.weatherIntensityBar.fillRect(barX, barY, barW * intensity, barH);
      }
    }
  }

  updateCombo(timeMs) {
    if (!this.comboSystem) return;
    
    const comboCount = this.comboSystem.getComboCount();
    
    if (comboCount < 5) {
      if (this.comboVisible) {
        this.comboText.setVisible(false);
        this.comboTimerBg.setVisible(false);
        this.comboTimerBar.setVisible(false);
        this.comboVisible = false;
      }
      return;
    }
    
    if (!this.comboVisible) {
      this.comboText.setVisible(true);
      this.comboTimerBg.setVisible(true);
      this.comboTimerBar.setVisible(true);
      this.comboVisible = true;
    }
    
    const multiplier = this.comboSystem.getMultiplier();
    const multiplierStr = multiplier.toFixed(2);
    setTextIfChanged(this.comboText, `🔥 COMBO ${comboCount}  ${multiplierStr}x`);

    // Combo pop — quick scale punch when combo count increases
    if (HUD_JUICE_CONFIG.enabled && HUD_JUICE_CONFIG.comboPop.enabled && comboCount > this._lastComboCount) {
      this._playComboPop();
    }
    this._lastComboCount = comboCount;

    let color = this.colors.primary;
    const multiplierTiers = COMBO_CONFIG.multiplierTiers && typeof COMBO_CONFIG.multiplierTiers === "object"
      ? COMBO_CONFIG.multiplierTiers
      : {};
    for (const tierConfig of Object.values(multiplierTiers)) {
      if (multiplier >= tierConfig.minMultiplier) {
        color = tierConfig.color;
      }
    }
    this.comboText.setColor(color);
    
    const timerFraction = this.comboSystem.getTimerFraction(timeMs);
    const barX = HUD_LAYOUT.comboBarX;
    const barY = HUD_LAYOUT.comboBarY + HUD_LAYOUT.comboBarH - HUD_LAYOUT.comboTimerBarH - HUD_LAYOUT.comboTimerBarPadding;
    const barW = HUD_LAYOUT.comboBarW;
    const barH = HUD_LAYOUT.comboTimerBarH;
    
    this.comboTimerBg.clear();
    this.comboTimerBg.fillStyle(HUD_LAYOUT.comboTimerBgColor, 1);
    this.comboTimerBg.fillRect(barX, barY, barW, barH);
    
    this.comboTimerBar.clear();
    this.comboTimerBar.fillStyle(HUD_LAYOUT.comboTimerColor, 1);
    const timerW = barW * timerFraction;
    this.comboTimerBar.fillRect(barX, barY, timerW, barH);
  }

  updateBuffTimers() {
    const labels = HUD_LAYOUT.buffTimerLabels;
    const colors = HUD_LAYOUT.buffTimerColors;
    const lines = [];

    if (this.specialBlockEffectsManager) {
      const effects = this.specialBlockEffectsManager.effects;

      if (effects.miningSpeedBoost.active) {
        const secs = this.specialBlockEffectsManager.getRemainingTime('miningSpeedBoost');
        const pct = Math.round((effects.miningSpeedBoost.multiplier - 1) * 100);
        lines.push(`${labels.miningSpeedBoost} +${pct}% ${secs}s`);
      }

      if (effects.damageBoost.active) {
        const secs = this.specialBlockEffectsManager.getRemainingTime('damageBoost');
        const pct = Math.round((effects.damageBoost.multiplier - 1) * 100);
        lines.push(`${labels.damageBoost} +${pct}% ${secs}s`);
      }

      if (effects.guaranteedCrit.active) {
        const secs = this.specialBlockEffectsManager.getRemainingTime('guaranteedCrit');
        lines.push(`${labels.guaranteedCrit} ${secs}s`);
      }
    }

    const campfire = this.scene.campfireSystem;
    if (campfire) {
      const buff = campfire.getActiveBuff();
      if (buff) {
        const remaining = Math.ceil(buff.remainingMs / 1000);
        lines.push(`🔥 ${buff.name} ${remaining}s`);
      }
    }

    if (lines.length > 0) {
      setTextIfChanged(this.buffTimerText, lines.join('\n'));
      this.buffTimerText.setVisible(true);
    } else {
      this.buffTimerText.setVisible(false);
    }
  }

  showProgressBar(label, progressPct, color, durationMs = 2000) {
    const viewportWidth = this.scene.scale.width;
    const viewportHeight = this.scene.scale.height;
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;

    const barWidth = 300;
    const barHeight = 20;
    const barX = centerX - barWidth / 2;
    const barY = centerY + 100;

    this.progressBarBg.setVisible(true);
    this.progressBar.setVisible(true);
    this.progressBarText.setVisible(true);

    this.progressBarBg.clear();
    this.progressBarBg.fillStyle(0x000000, 0.7);
    this.progressBarBg.fillRect(barX, barY, barWidth, barHeight);

    this.progressBar.clear();
    this.progressBar.fillStyle(parseInt(color.replace('#', '0x'), 16), 1);
    const progressWidth = barWidth * (progressPct / 100);
    this.progressBar.fillRect(barX, barY, progressWidth, barHeight);

    this.progressBarText.setText(`${label}: ${progressPct}%`);
    this.progressBarText.setPosition(centerX, barY - 15);
    this.progressBarText.setOrigin(0.5);

    this.progressBarUntil = this.scene.time.now + durationMs;
  }

  updateProgressBar(timeMs) {
    if (timeMs >= this.progressBarUntil) {
      this.progressBarBg.setVisible(false);
      this.progressBar.setVisible(false);
      this.progressBarText.setVisible(false);
    }
  }

  _playComboPop() {
    const cfg = HUD_JUICE_CONFIG.comboPop;
    if (!this.comboText?.active) return;
    if (this._comboPopTween) {
      this._comboPopTween.stop();
    }
    this.comboText.setScale(1);
    this._comboPopTween = this.scene.tweens.add({
      targets: this.comboText,
      scale: cfg.scaleAmount,
      duration: cfg.durationMs,
      ease: cfg.ease,
      yoyo: true,
      onComplete: () => {
        if (this.comboText?.active) this.comboText.setScale(1);
        this._comboPopTween = null;
      },
    });
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this._depthTween?.stop();
    this._comboPopTween?.stop();
    const objects = [
      this.hudBg, this.statsText, this.statusBg, this.statusText,
      this.flyHintText, this.dashCooldownText, this.torchIcon, this.torchStatusText, this.buffTimerText,
      this.comboText, this.comboTimerBg, this.comboTimerBar,
      this.progressBarBg, this.progressBar, this.progressBarText,
      this.clockPanel, this.clockTimeText, this.clockDayText,
      this.weatherPanel, this.weatherText, this.weatherTempText,
      this.weatherSeasonText, this.weatherIntensityBar,
      this.lootBagContainer,
    ];
    objects.forEach(obj => obj?.destroy());
  }

  refresh() {
    if (this._destroyed || !this.statsText?.active) return;
    const displayDepth = Math.round(this._displayedDepth);
    this.statsText.setText(`Depth: ${displayDepth}m`);
  }
}
