import { HUD_LAYOUT } from "../../values/hudLayout.js";
import { COMBO_CONFIG } from "../../values/comboConfig.js";
import { UI_COLORS } from "../../values/uiColors.js";
import { LIGHT_CONFIG } from "../../values/lightConfig.js";
import { USER_SETTINGS } from "../UserSettings.js";
import { ensureHudTorchTextures } from "../../ui/GeneratedHudTextures.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";

export class HUDSystem {
  constructor(scene, maxXTile, refreshIntervalMs = 90) {
    this.scene = scene;
    this.maxXTile = maxXTile;
    this.refreshIntervalMs = refreshIntervalMs;

    this.depth = 0;
    this.xTile = 0;
    this.tilesBroken = 0;
    this.aim = "RIGHT";
    this.gemPowerPercent = 0;
    this.gemPowerRaw = 0;
    this.gemPowerMax = 0;
    this.torchActive = false;
    this.torchDrainGpPerSecond = LIGHT_CONFIG.torchDrainGpPerSecond;
    this._destroyed = false;

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
    }
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
      this.clockTimeText.setText(dnc.getTimeString12());

      const phaseLabel = dnc.getCurrentPhaseLabel();
      const day = dnc.getDay();
      this.clockDayText.setText(`Day ${day} — ${phaseLabel}`);
    }

    if (ws) {
      const snap = ws.getSnapshot();
      const weatherIcons = {
        clear: "☀️",
        drizzle: "🌦",
        rain: "🌧",
        storm: "⛈",
      };
      const icon = weatherIcons[snap.kind] || "☀️";
      const label = snap.kind.charAt(0).toUpperCase() + snap.kind.slice(1);
      const forecast = snap.forecastKind && snap.forecastKind !== snap.kind
        ? ` -> ${snap.forecastKind.charAt(0).toUpperCase() + snap.forecastKind.slice(1)}`
        : "";
      this.weatherText.setText(`${icon} ${label}${forecast}`);

      if (dnc) {
        this.weatherTempText.setText(`${dnc.getCurrentTemperature()}°C`);
      }

      if (dnc) {
        const season = dnc.getSeason();
        const seasonIcons = { spring: "🌸", summer: "☀️", autumn: "🍂", winter: "❄️" };
        this.weatherSeasonText.setText(`${seasonIcons[season] || ""} ${season.charAt(0).toUpperCase() + season.slice(1)}`);
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
    this.comboText.setText(`🔥 COMBO ${comboCount}  ${multiplierStr}x`);
    
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
      this.buffTimerText.setText(lines.join('\n'));
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

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
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
    this.statsText.setText(`Depth: ${this.depth}m`);
  }
}
