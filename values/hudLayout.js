// ==================== HUD LAYOUT CONFIG ====================
export const HUD_LAYOUT = Object.freeze({
  // HUD stats text (top-left)
  statsX: 15, statsY: 16, statsFontSize: "20px", statsLineSpacing: 5,

  // HUD status flash text
  statusX: 500, statusY: 190, statusFontSize: "18px",
  flashStatusDefaultColor: "#ffd98f", flashStatusDefaultDurationMs: 350,

  // Status bar geometry (GP and HP bars)
  barX: 15, barW: 110, barH: 12,
  gpBarY: 200,
  gpLabelX: 15, gpLabelY: 220, gpLabelFontSize: "14px", gpLabelColor: "#aa66ff",
  torchLabelX: 15, torchLabelY: 240, torchLabelFontSize: "13px",
  torchIconX: 13, torchIconY: 226, torchIconW: 36, torchIconH: 36, torchLabelTextX: 56,
  torchLabelOnColor: "#ffc06a", torchLabelOffColor: "#888888",
  barBgColor: 0x1a1a2e, barBgAlpha: 0.75,
  gpColorHigh: 0xaa88ff, gpColorMid: 0xffaa00, gpColorLow: 0xff4444,
  gpThresholdHigh: 0.5, gpThresholdMid: 0.25,


  // Sky island world label
  skyLabelFontSize: "18px", skyLabelColor: "#ffee88",

  // Scene depths
  hudDepth: 1000,
  hudOverlayDepth: 1001,
  playerDepth: 20,
  fxDepth: 35,
  bgMaskDepth: 50,
  floatingTextDepth: 55, // Above world elements (fxDepth 35) but below HUD overlay so floating text is visible
  collisionDebugDepth: 9999,

  // FloatingTextSystem defaults
  floatDefaultDurationMs: 800, floatDefaultFontSize: 18,
  floatStrokeThickness: 3, floatShadowX: 2, floatShadowY: 2,
  floatUpPx: 40,
  
  // Damage numbers — scaled by damage amount
  floatDamageColor: "#ff6666", floatDamageDurationMs: 800, floatDamageFontSize: 22,
  floatDamageBigThreshold: 50,  // damage >= 50 = big text
  floatDamageBigFontSize: 28,
  floatDamageBigColor: "#ffaa44",
  floatDamageHugeThreshold: 150, // damage >= 150 = huge text
  floatDamageHugeFontSize: 36,
  floatDamageHugeColor: "#ff4444",
  floatDamagePoPx: 15,  // how much the number pops up on entry
  
  floatResourceDurationMs: 1000, floatResourceFontSize: 20,

  // Critical hit floating text (extra large with flash)
  floatCriticalColor: "#ff3333", floatCriticalDurationMs: 1100, floatCriticalFontSize: 36,
  floatCriticalStrokeThickness: 4, floatCriticalShadowX: 3, floatCriticalShadowY: 3, floatCriticalUpPx: 60,

  // Resource luck bonus floating text (extra large with flash)
  floatLuckDurationMs: 1200, floatLuckFontSize: 28,
  floatLuckStrokeThickness: 4, floatLuckShadowX: 2, floatLuckShadowY: 2, floatLuckUpPx: 50,

  // Heavy punch hit floating text (orange, distinct from normal damage)
  floatHeavyPunchFontSize: 28, floatHeavyPunchDurationMs: 900, floatHeavyPunchUpPx: 50,
  floatHeavyPunchStrokeThickness: 3, floatHeavyPunchShadowX: 2, floatHeavyPunchShadowY: 2,

  // SpecialTileSystem prompt text
  promptFontSize: "16px", promptPadX: 8, promptPadY: 4,
  promptStrokeThickness: 3,

  // Combo bar (above XP bar)
  comboBarX: 15, comboBarY: 150, comboBarW: 200, comboBarH: 35,
  comboFontSize: "18px", comboFontColor: "#ffffff",
  comboTimerBarH: 4, comboTimerBarPadding: 2,
  comboTimerColor: 0x44aaff, comboTimerBgColor: 0x1a1a2e,

  // HUD background panel (behind statsText area)
  hudPanelBgColor: 0x000000, hudPanelBgAlpha: 0.52,
  hudPanelW: 175, hudPanelH: 38,

  // Status flash message background pill
  statusBgColor: 0x000000, statusBgAlpha: 0.60,

  // Clock widget (top-right corner)
  clockX: 0, clockY: 16, clockFontSize: "18px",
  clockColor: "#ffd700",
  clockDayFontSize: "14px",
  clockDayColor: "#aaaaaa",
  clockPanelW: 180, clockPanelH: 66,
  clockPanelBgColor: 0x000000, clockPanelBgAlpha: 0.45,

  // Weather widget (below clock)
  weatherX: 0, weatherY: 90, weatherFontSize: "16px",
  weatherColor: "#88ccff",
  weatherTempColor: "#ffaa44",
  weatherSeasonColor: "#66dd88",
  weatherPanelW: 180, weatherPanelH: 90,
  weatherPanelBgColor: 0x000000, weatherPanelBgAlpha: 0.40,

  // Season indicator
  seasonX: 0, seasonY: 140, seasonFontSize: "14px",

  // Flight hint text (below stats)
  flyHintX: 500, flyHintY: 80, flyHintFontSize: "15px",

  // Buff timers (special block effects — below combo area)
  buffTimerX: 15, buffTimerY: 275, buffTimerLineH: 35,
  buffTimerFontSize: "25px",
  buffTimerStrokeThickness: 2,
  buffTimerColors: {
    miningSpeedBoost: "#FFD700",   // Gold — speed
    damageBoost: "#DC143C",        // Crimson — berserk
    guaranteedCrit: "#FF0000",     // Red — crit
  },
  buffTimerLabels: {
    miningSpeedBoost: "⚡ SPD",
    damageBoost: "💪 DMG",
    guaranteedCrit: "💥 CRIT",
  },
});
